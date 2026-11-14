output "service_name" {
  description = "Cloud Run service name."
  value       = google_cloud_run_v2_service.api.name
}

output "service_url" {
  description = "The service's run.app URL."
  value       = google_cloud_run_v2_service.api.uri
}

output "api_url" {
  description = "The gateway's public origin: the web build's VITE_API_BASE_URL and the gateway's PUBLIC_BASE_URL."
  value       = local.api_url
}

output "web_url" {
  description = "The web app's public origin: its custom domain, or the web.app URL without one."
  value       = local.web_url
}

output "hosting_url" {
  description = "The web app on Firebase Hosting's own domain."
  value       = local.hosting_url
}

output "hosting_site_id" {
  description = "Firebase Hosting site the deploy job uploads to."
  value       = google_firebase_hosting_site.default.site_id
}

output "storybook_url" {
  description = "The Storybook's public origin: its custom domain, or its web.app URL without one."
  value       = local.storybook_url
}

output "storybook_hosting_url" {
  description = "The Storybook on Firebase Hosting's own domain."
  value       = local.storybook_hosting_url
}

output "storybook_site_id" {
  description = "Firebase Hosting site the deploy job uploads the Storybook to (web/firebase.json's storybook target)."
  value       = google_firebase_hosting_site.storybook.site_id
}

output "image_repository" {
  description = "Where the deploy job pushes images (append /api-gateway:<tag> or /data-server:<tag>)."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "cors_allowed_origins" {
  description = "Origins the gateway allows (CORS_ALLOWED_ORIGINS)."
  value       = local.cors_allowed_origins
}

output "web_domain_ready" {
  description = "Whether Hosting serves the web domain with an active certificate. Until then the gateway also allows the web.app origin."
  value       = local.web_domain_ready
}

output "storybook_domain_ready" {
  description = "Whether Hosting serves the Storybook domain with an active certificate. Until then the deploy job smoke-tests its web.app URL."
  value       = local.storybook_domain_ready
}

output "api_domain_ready" {
  description = "Whether the API domain's mapping reports Ready (its certificate is issued)."
  value       = local.api_domain_ready
}

output "custom_domain_dns_records" {
  description = "DNS records Hosting and Cloud Run ask for, to compare with the fixed records in domains.tf. Hosting's list fills in after its first apply, the mapping's once Cloud Run has made it."
  value = concat(
    flatten([
      for d in concat(google_firebase_hosting_custom_domain.web, google_firebase_hosting_custom_domain.storybook) : [
        for u in d.required_dns_updates : [
          for want in u.desired : [
            for r in want.records : { name = r.domain_name, type = r.type, data = r.rdata }
            if r.required_action == "ADD"
          ]
        ]
      ]
    ]),
    flatten([
      for m in google_cloud_run_domain_mapping.api : [
        for st in m.status : [
          for r in st.resource_records : { name = r.name, type = r.type, data = r.rrdata }
        ]
      ]
    ]),
  )
}
