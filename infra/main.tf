locals {
  labels = {
    app        = "lmwn"
    managed-by = "terraform"
  }

  # One Cloud Run service: the gateway is the ingress container, the provided
  # data server its sidecar (run.tf).
  service_name = "api-gateway"

  # Hosting's default site is named after the project: https://<project>.web.app.
  hosting_site_id = var.project_id

  # The Storybook's own site. Site IDs are global across Firebase, so it is
  # named after the project too.
  storybook_site_id = "${var.project_id}-storybook"
}

# APIs this configuration uses. The provider repo enables them up front in
# the prod project; enabling them here as well keeps the module self-contained.
# Never disabled on destroy.
resource "google_project_service" "enabled" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "firebase.googleapis.com",
    "firebasehosting.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "run.googleapis.com",
    "siteverification.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}

# The project number, for the service's deterministic run.app URL (run.tf).
data "google_project" "this" {
  project_id = var.project_id
}
