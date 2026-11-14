# Offline checks of what prod plans (mock providers, no cloud access):
#   terraform -chdir=infra init -backend=false && terraform -chdir=infra test

mock_provider "google" {
  mock_resource "google_service_account" {
    defaults = {
      email  = "api-gateway-run@lmwn-prod-df7136.iam.gserviceaccount.com"
      member = "serviceAccount:api-gateway-run@lmwn-prod-df7136.iam.gserviceaccount.com"
    }
  }
  mock_resource "google_cloud_run_v2_service" {
    defaults = {
      uri = "https://api-gateway-123456789012.asia-southeast1.run.app"
    }
  }
  mock_data "google_project" {
    defaults = {
      number = "123456789012"
    }
  }
  mock_data "google_site_verification_token" {
    defaults = {
      token = "google-site-verification=mocktoken"
    }
  }
}
mock_provider "google-beta" {}
mock_provider "cloudflare" {
  mock_data "cloudflare_zone" {
    defaults = {
      zone_id = "0123456789abcdef0123456789abcdef"
    }
  }
}

variables {
  project_id        = "lmwn-prod-df7136"
  region            = "asia-southeast1"
  gateway_image     = "asia-southeast1-docker.pkg.dev/lmwn-prod-df7136/lmwn/api-gateway:0123abc"
  data_server_image = "asia-southeast1-docker.pkg.dev/lmwn-prod-df7136/lmwn/data-server:0123abc"
  web_domain        = "hidden-gems.bonanaaaaaa.dev"
  api_domain        = "api-hidden-gems.bonanaaaaaa.dev"
  storybook_domain  = "storybook-hidden-gems.bonanaaaaaa.dev"
  dns_zone          = "bonanaaaaaa.dev"
}

run "prod_runs_the_gateway_with_the_data_server_as_sidecar" {
  command = apply

  assert {
    condition     = [for c in google_cloud_run_v2_service.api.template[0].containers : c.name] == ["api-gateway", "data-server"]
    error_message = "one service: the gateway and the data server as its sidecar."
  }
  assert {
    condition = (
      length(google_cloud_run_v2_service.api.template[0].containers[0].ports) == 1 &&
      google_cloud_run_v2_service.api.template[0].containers[0].ports[0].container_port == 8080 &&
      length(google_cloud_run_v2_service.api.template[0].containers[1].ports) == 0
    )
    error_message = "only the gateway receives requests (port 8080); the sidecar exposes no port."
  }
  assert {
    condition     = google_cloud_run_v2_service.api.template[0].containers[0].depends_on == tolist(["data-server"])
    error_message = "the gateway starts after the data server is ready."
  }
  assert {
    condition = (
      google_cloud_run_v2_service.api.template[0].containers[0].image == var.gateway_image &&
      google_cloud_run_v2_service.api.template[0].containers[1].image == var.data_server_image
    )
    error_message = "each container runs the image the deploy job pushed."
  }
  assert {
    condition     = google_cloud_run_v2_service.api.template[0].scaling[0].min_instance_count == 0
    error_message = "the service scales to zero."
  }
  assert {
    condition     = google_cloud_run_v2_service.api.invoker_iam_disabled && google_cloud_run_v2_service.api.ingress == "INGRESS_TRAFFIC_ALL"
    error_message = "anyone may call the public gateway."
  }
  assert {
    condition = {
      for e in google_cloud_run_v2_service.api.template[0].containers[0].env : e.name => e.value
      } == {
      GUIDE_SERVICE_URL      = "http://localhost:8888"
      RESTAURANT_SERVICE_URL = "http://localhost:9999"
      PHOTO_SERVICE_URL      = "http://localhost:7777"
      PUBLIC_BASE_URL        = "https://api-hidden-gems.bonanaaaaaa.dev"
      CORS_ALLOWED_ORIGINS   = "[\"https://hidden-gems.bonanaaaaaa.dev\",\"https://lmwn-prod-df7136.web.app\"]"
    }
    error_message = "the gateway reaches the sidecar on localhost, rewrites photo URLs to the API domain, and allows the web domain (plus web.app until its certificate is active)."
  }
  assert {
    condition     = google_cloud_run_v2_service.api.template[0].service_account == google_service_account.run.email
    error_message = "the service runs as its own runtime account."
  }
  assert {
    condition     = output.api_url == "https://api-hidden-gems.bonanaaaaaa.dev" && output.web_url == "https://hidden-gems.bonanaaaaaa.dev"
    error_message = "the web build calls the API domain; the web app lives on the web domain."
  }
  assert {
    condition     = output.image_repository == "asia-southeast1-docker.pkg.dev/lmwn-prod-df7136/lmwn"
    error_message = "images go to the lmwn repository in the project's region."
  }
}

run "prod_keeps_the_domains_and_their_dns_records" {
  command = apply

  assert {
    condition = (
      google_firebase_hosting_custom_domain.web[0].site_id == "lmwn-prod-df7136" &&
      google_firebase_hosting_custom_domain.web[0].custom_domain == "hidden-gems.bonanaaaaaa.dev" &&
      !google_firebase_hosting_custom_domain.web[0].wait_dns_verification
    )
    error_message = "the web domain is a custom domain of the default Hosting site, created without waiting for DNS."
  }
  assert {
    condition = (
      google_cloud_run_domain_mapping.api[0].name == "api-hidden-gems.bonanaaaaaa.dev" &&
      google_cloud_run_domain_mapping.api[0].location == "asia-southeast1" &&
      google_cloud_run_domain_mapping.api[0].metadata[0].namespace == "lmwn-prod-df7136" &&
      google_cloud_run_domain_mapping.api[0].spec[0].route_name == "api-gateway"
    )
    error_message = "the API domain maps to the api-gateway service in its region."
  }
  assert {
    condition = {
      for k, r in cloudflare_dns_record.domains : k => "${r.name} ${r.type} ${r.content}"
      } == {
      web_a         = "hidden-gems.bonanaaaaaa.dev A 199.36.158.100"
      web_txt       = "hidden-gems.bonanaaaaaa.dev TXT \"hosting-site=lmwn-prod-df7136\""
      storybook_a   = "storybook-hidden-gems.bonanaaaaaa.dev A 199.36.158.100"
      storybook_txt = "storybook-hidden-gems.bonanaaaaaa.dev TXT \"hosting-site=lmwn-prod-df7136-storybook\""
      api_cname     = "api-hidden-gems.bonanaaaaaa.dev CNAME ghs.googlehosted.com"
    }
    error_message = "Hosting's A and hosting-site TXT on the web and Storybook domains, Cloud Run's CNAME on the API domain."
  }
  assert {
    condition     = alltrue([for r in cloudflare_dns_record.domains : r.proxied == false])
    error_message = "records are DNS only, so Google can issue the certificates."
  }
  assert {
    condition = (
      cloudflare_dns_record.site_verification[0].name == "bonanaaaaaa.dev" &&
      cloudflare_dns_record.site_verification[0].content == "\"google-site-verification=mocktoken\"" &&
      google_site_verification_web_resource.zone[0].site[0].identifier == "bonanaaaaaa.dev"
    )
    error_message = "the deploy identity verifies the zone with its own TXT record at the apex."
  }
  assert {
    condition     = !output.web_domain_ready && !output.storybook_domain_ready && !output.api_domain_ready
    error_message = "nothing is ready before Google reports it."
  }
}

run "prod_serves_the_storybook_on_its_own_site_and_domain" {
  command = apply

  assert {
    condition = (
      google_firebase_hosting_site.storybook.site_id == "lmwn-prod-df7136-storybook" &&
      google_firebase_hosting_site.storybook.site_id != google_firebase_hosting_site.default.site_id
    )
    error_message = "the Storybook has its own Hosting site beside the app's."
  }
  assert {
    condition = (
      google_firebase_hosting_custom_domain.storybook[0].site_id == "lmwn-prod-df7136-storybook" &&
      google_firebase_hosting_custom_domain.storybook[0].custom_domain == "storybook-hidden-gems.bonanaaaaaa.dev" &&
      !google_firebase_hosting_custom_domain.storybook[0].wait_dns_verification
    )
    error_message = "the Storybook domain is a custom domain of the Storybook site, created without waiting for DNS."
  }
  assert {
    condition = (
      output.storybook_url == "https://storybook-hidden-gems.bonanaaaaaa.dev" &&
      output.storybook_hosting_url == "https://lmwn-prod-df7136-storybook.web.app" &&
      output.storybook_site_id == "lmwn-prod-df7136-storybook"
    )
    error_message = "the Storybook lives on its domain, with its web.app URL beside it."
  }
  assert {
    condition     = !contains(output.cors_allowed_origins, output.storybook_url) && !contains(output.cors_allowed_origins, output.storybook_hosting_url)
    error_message = "the gateway does not allow the Storybook: stories never call it."
  }
}

run "the_storybook_domain_is_ready_once_its_certificate_is_active" {
  command   = apply
  state_key = "storybook_domain_ready"

  override_resource {
    target = google_firebase_hosting_custom_domain.storybook[0]
    values = {
      host_state = "HOST_ACTIVE"
      cert       = [{ state = "CERT_ACTIVE", type = "GROUPED", verification = [] }]
    }
  }

  assert {
    condition     = output.storybook_domain_ready && !output.web_domain_ready
    error_message = "an active host and certificate make the Storybook domain ready, independently of the web domain."
  }
}

run "cors_allows_only_the_web_domain_once_it_serves" {
  command = apply
  # A fresh state, so the custom domain is created with the overridden values.
  state_key = "web_domain_ready"

  override_resource {
    target = google_firebase_hosting_custom_domain.web[0]
    values = {
      host_state = "HOST_ACTIVE"
      cert       = [{ state = "CERT_ACTIVE", type = "GROUPED", verification = [] }]
    }
  }

  assert {
    condition     = output.web_domain_ready
    error_message = "an active host and certificate make the web domain ready."
  }
  assert {
    condition     = output.cors_allowed_origins == tolist(["https://hidden-gems.bonanaaaaaa.dev"])
    error_message = "once the web domain serves, CORS allows only it."
  }
}

run "without_domains_everything_stays_on_google_urls" {
  command = plan

  variables {
    web_domain       = ""
    api_domain       = ""
    storybook_domain = ""
    dns_zone         = ""
  }

  assert {
    condition = (
      length(google_firebase_hosting_custom_domain.web) == 0 &&
      length(google_firebase_hosting_custom_domain.storybook) == 0 &&
      length(google_cloud_run_domain_mapping.api) == 0 &&
      length(cloudflare_dns_record.domains) == 0 &&
      length(cloudflare_dns_record.site_verification) == 0 &&
      length(google_site_verification_web_resource.zone) == 0
    )
    error_message = "no domains, DNS records or verification without them."
  }
  assert {
    condition = (
      output.api_url == "https://api-gateway-123456789012.asia-southeast1.run.app" &&
      output.cors_allowed_origins == tolist(["https://lmwn-prod-df7136.web.app"]) &&
      output.storybook_url == "https://lmwn-prod-df7136-storybook.web.app" &&
      output.storybook_domain_created == ""
    )
    error_message = "the gateway's public URL is its run.app URL, it allows the web.app origin, and the Storybook is on its web.app URL."
  }
}

run "rejects_a_domain_outside_the_zone" {
  command = plan

  variables {
    api_domain = "api.example.com"
  }

  expect_failures = [var.dns_zone]
}

run "rejects_a_storybook_domain_outside_the_zone" {
  command = plan

  variables {
    storybook_domain = "storybook.example.com"
  }

  expect_failures = [var.dns_zone]
}

run "rejects_an_image_without_tag_or_digest" {
  command = plan

  variables {
    gateway_image = "asia-southeast1-docker.pkg.dev/lmwn-prod-df7136/lmwn/api-gateway"
  }

  expect_failures = [var.gateway_image]
}
