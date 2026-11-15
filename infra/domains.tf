# Custom domains: the web app on a Firebase Hosting custom domain (web_domain),
# the Storybook on one of its own site (storybook_domain) and the gateway on a
# Cloud Run domain mapping (api_domain). The web.app and run.app URLs keep
# working beside them.
#
# With dns_zone set (prod: bonanaaaaaa.dev in Cloudflare), Terraform keeps the
# records the domains need there, all DNS only (not proxied: Google issues the
# certificates and must see its own servers), and verifies the zone in Google
# Search Console for the deploy identity, which Cloud Run requires before it
# maps a domain.

resource "google_firebase_hosting_custom_domain" "web" {
  provider = google-beta
  count    = var.web_domain != "" ? 1 : 0

  site_id       = google_firebase_hosting_site.default.site_id
  custom_domain = var.web_domain
  # Its records are made beside it (or by hand without dns_zone): do not wait
  # for them here.
  wait_dns_verification = false
}

resource "google_firebase_hosting_custom_domain" "storybook" {
  provider = google-beta
  count    = var.storybook_domain != "" ? 1 : 0

  site_id               = google_firebase_hosting_site.storybook.site_id
  custom_domain         = var.storybook_domain
  wait_dns_verification = false
}

resource "google_cloud_run_domain_mapping" "api" {
  count = var.api_domain != "" ? 1 : 0

  name     = var.api_domain
  location = var.region

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.api.name
  }

  # Cloud Run maps a domain only for a verified owner of it.
  depends_on = [google_site_verification_web_resource.zone]
}

# --- DNS in the Cloudflare zone (dns_zone), and its verification.

data "cloudflare_zone" "this" {
  count = var.dns_zone != "" ? 1 : 0

  filter = {
    name = var.dns_zone
  }
}

# Search Console: the deploy identity verifies the whole zone with a TXT record
# at its apex, and so becomes a verified owner of every subdomain. It sits
# beside other identities' verification TXT records (each deploy identity has
# its own token). Calls the Site Verification API, hence that scope on the provider.
data "google_site_verification_token" "zone" {
  count = var.dns_zone != "" ? 1 : 0

  type                = "INET_DOMAIN"
  identifier          = var.dns_zone
  verification_method = "DNS_TXT"

  depends_on = [google_project_service.enabled]
}

resource "cloudflare_dns_record" "site_verification" {
  count = var.dns_zone != "" ? 1 : 0

  zone_id = data.cloudflare_zone.this[0].zone_id
  name    = var.dns_zone
  type    = "TXT"
  content = "\"${data.google_site_verification_token.zone[0].token}\""
  ttl     = 1
  comment = "Google Search Console: lmwn deploy identity (Terraform, bonanaaaaaa-org/lmwn)"
}

resource "google_site_verification_web_resource" "zone" {
  count = var.dns_zone != "" ? 1 : 0

  site {
    type       = "INET_DOMAIN"
    identifier = var.dns_zone
  }
  verification_method = "DNS_TXT"

  depends_on = [cloudflare_dns_record.site_verification]
}

locals {
  # What Firebase Hosting and Cloud Run ask for: each site's A record and
  # ownership TXT on its domain (web, Storybook), a CNAME to Google's front end for the API
  # domain. Fixed rather than read from the resources, whose lists are unknown
  # until they exist; the output custom_domain_dns_records shows what they ask
  # for, to compare.
  dns_records = var.dns_zone == "" ? {} : merge(
    var.web_domain == "" ? {} : {
      web_a   = { name = var.web_domain, type = "A", content = "199.36.158.100" }
      web_txt = { name = var.web_domain, type = "TXT", content = "\"hosting-site=${google_firebase_hosting_site.default.site_id}\"" }
    },
    var.storybook_domain == "" ? {} : {
      storybook_a   = { name = var.storybook_domain, type = "A", content = "199.36.158.100" }
      storybook_txt = { name = var.storybook_domain, type = "TXT", content = "\"hosting-site=${google_firebase_hosting_site.storybook.site_id}\"" }
    },
    var.api_domain == "" ? {} : {
      api_cname = { name = var.api_domain, type = "CNAME", content = "ghs.googlehosted.com" }
    },
  )
}

resource "cloudflare_dns_record" "domains" {
  for_each = local.dns_records

  zone_id = data.cloudflare_zone.this[0].zone_id
  name    = each.value.name
  type    = each.value.type
  content = each.value.content
  ttl     = 1
  proxied = false
  comment = "lmwn custom domain (Terraform, bonanaaaaaa-org/lmwn)"
}

locals {
  # The web domain serves once Hosting reaches it and its certificate is
  # active (read at each deploy's plan). Until then the gateway also allows the
  # web.app origin, so the app can be tried there.
  web_domain_ready = anytrue([
    for d in google_firebase_hosting_custom_domain.web :
    d.host_state == "HOST_ACTIVE" && anytrue([for c in coalesce(d.cert, []) : c.state == "CERT_ACTIVE"])
  ])

  # The same for the Storybook's domain. Until then the deploy job smoke-tests
  # the Storybook on its web.app URL.
  storybook_domain_ready = anytrue([
    for d in google_firebase_hosting_custom_domain.storybook :
    d.host_state == "HOST_ACTIVE" && anytrue([for c in coalesce(d.cert, []) : c.state == "CERT_ACTIVE"])
  ])

  # The mapping serves once its certificate is issued (condition Ready=True).
  api_domain_ready = length(google_cloud_run_domain_mapping.api) > 0 && anytrue([
    for c in try(google_cloud_run_domain_mapping.api[0].status[0].conditions, []) :
    c.type == "Ready" && c.status == "True"
  ])
}
