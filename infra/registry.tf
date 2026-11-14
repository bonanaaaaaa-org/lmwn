# The images: <region>-docker.pkg.dev/<project>/lmwn/{api-gateway,data-server}:<commit>.
resource "google_artifact_registry_repository" "images" {
  repository_id = "lmwn"
  location      = var.region
  format        = "DOCKER"
  description   = "api-gateway and data-server images for Cloud Run."

  # Keeps storage near the free 0.5 GB: the newest few versions of each image
  # stay (the running ones among them), older ones go after a week.
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "keep-newest"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }
  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      tag_state  = "ANY"
      older_than = "604800s"
    }
  }

  depends_on = [google_project_service.enabled]
}
