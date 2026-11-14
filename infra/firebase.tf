# Firebase on the project, for Hosting only: the web app is a static SPA
# (web/build/client) that calls the gateway, with no Firebase SDK. Terraform
# makes the site; the deploy job uploads the files and web/firebase.json's
# rewrites and headers with the Firebase CLI.
resource "google_firebase_project" "this" {
  provider = google-beta

  project = var.project_id

  depends_on = [google_project_service.enabled]
}

# The default site, named after the project: https://<project>.web.app.
resource "google_firebase_hosting_site" "default" {
  provider = google-beta

  site_id = local.hosting_site_id

  depends_on = [google_firebase_project.this]
}

# A second site for the static Storybook build (web/storybook-static), so
# reviewers can browse the components and their states: https://<project>-storybook.web.app.
# The deploy job uploads it with web/firebase.json's "storybook" target.
resource "google_firebase_hosting_site" "storybook" {
  provider = google-beta

  site_id = local.storybook_site_id

  depends_on = [google_firebase_project.this]
}

locals {
  storybook_hosting_url = "https://${local.storybook_site_id}.web.app"
  storybook_url         = var.storybook_domain != "" ? "https://${var.storybook_domain}" : local.storybook_hosting_url
}
