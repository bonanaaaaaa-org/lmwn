locals {
  # The service's run.app URL, deterministic from its name, project number and
  # region, so the service's own environment can name it without referring to
  # itself.
  run_app_url = "https://${local.service_name}-${data.google_project.this.number}.${var.region}.run.app"

  # The gateway's public origin: where the web app calls it and where photo
  # URLs point (PUBLIC_BASE_URL). The API domain when there is one, fixed
  # rather than switched on its certificate (the mapping needs the service, so
  # the service can't read the mapping's state).
  api_url = var.api_domain != "" ? "https://${var.api_domain}" : local.run_app_url

  hosting_url = "https://${local.hosting_site_id}.web.app"
  web_url     = var.web_domain != "" ? "https://${var.web_domain}" : local.hosting_url

  # Browsers may call the gateway only from the web app: its domain once that
  # serves, plus the web.app URL until then.
  cors_allowed_origins = (
    var.web_domain == "" ? [local.hosting_url] :
    local.web_domain_ready ? [local.web_url] :
    [local.web_url, local.hosting_url]
  )

  gateway_env = {
    # The sidecar's three ports, on the instance's shared localhost.
    GUIDE_SERVICE_URL      = "http://localhost:8888"
    RESTAURANT_SERVICE_URL = "http://localhost:9999"
    PHOTO_SERVICE_URL      = "http://localhost:7777"
    # Photo URLs from the data server point at localhost:7777; the gateway
    # rewrites them to its own /photos route on this origin.
    PUBLIC_BASE_URL = local.api_url
    # pydantic-settings reads a list setting as JSON.
    CORS_ALLOWED_ORIGINS = jsonencode(local.cors_allowed_origins)
  }
}

# One service, two containers: the gateway receives requests; the provided data
# server runs beside it as a sidecar, because it listens on three ports and a
# Cloud Run service exposes one. Scales to zero.
resource "google_cloud_run_v2_service" "api" {
  name     = local.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  # A public read-only API for a browser app: anyone may invoke it. This
  # instead of an allUsers binding, which a domain-restricted sharing policy
  # would refuse.
  invoker_iam_disabled = true
  deletion_protection  = var.deletion_protection

  template {
    service_account = google_service_account.run.email
    # Full Linux compatibility for mongod and sharp in the sidecar.
    execution_environment            = "EXECUTION_ENVIRONMENT_GEN2"
    timeout                          = "30s"
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances
    }

    containers {
      name  = "api-gateway"
      image = var.gateway_image
      # Starts once the data server's startup probe passes.
      depends_on = ["data-server"]

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        # CPU only while a request is in flight (request-based billing).
        cpu_idle          = true
        startup_cpu_boost = true
      }

      dynamic "env" {
        for_each = local.gateway_env
        content {
          name  = env.key
          value = env.value
        }
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        period_seconds    = 2
        failure_threshold = 15
        timeout_seconds   = 2
      }
    }

    containers {
      name  = "data-server"
      image = var.data_server_image

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      # The server starts its in-memory MongoDB, seeds it, then listens: an
      # open guides port means ready.
      startup_probe {
        tcp_socket {
          port = 8888
        }
        period_seconds    = 2
        failure_threshold = 60
        timeout_seconds   = 2
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
    ]
  }

  depends_on = [google_project_iam_member.run_log_writer]
}
