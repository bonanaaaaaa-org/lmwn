# The identity Cloud Run runs as. Neither container calls a Google API, so it
# only writes logs. The deploy service account (repo-management) owns the
# project, so this configuration manages the account itself.
resource "google_service_account" "run" {
  account_id   = "api-gateway-run"
  display_name = "lmwn api-gateway Cloud Run"
  description  = "Runtime identity of the lmwn api-gateway service. Managed by infra/ in bonanaaaaaa-org/lmwn."

  depends_on = [google_project_service.enabled]
}

resource "google_project_iam_member" "run_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = google_service_account.run.member
}
