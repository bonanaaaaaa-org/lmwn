# Both Google providers act in the prod project and bill API quota to it
# (user_project_override): the deploy identity lives in repo-management's
# management project, where the Firebase and other APIs are not enabled.
provider "google" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
  billing_project       = var.project_id
  default_labels        = local.labels
  # The defaults plus the Site Verification API's own scope, which
  # cloud-platform does not cover: the deploy identity verifies the zone so
  # Cloud Run lets it map the API domain (domains.tf).
  scopes = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/siteverification",
  ]
}

provider "google-beta" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
  billing_project       = var.project_id
  default_labels        = local.labels
}

# The token comes from CLOUDFLARE_API_TOKEN (prod only: DNS records of
# bonanaaaaaa.dev and nothing else). Unused, and so not needed, where
# dns_zone is empty.
provider "cloudflare" {}
