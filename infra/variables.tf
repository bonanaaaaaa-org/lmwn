# The project and region come from the prod GitHub environment's
# GCP_PROJECT_ID and GCP_REGION (TF_VAR_project_id, TF_VAR_region), the images
# from the deploy job (TF_VAR_gateway_image, TF_VAR_data_server_image), the
# rest from env/prod.tfvars.

variable "project_id" {
  description = "The GCP project, created by repo-management (GCP_PROJECT_ID)."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "project_id must be a GCP project ID (set TF_VAR_project_id from the environment's GCP_PROJECT_ID)."
  }
}

variable "region" {
  description = "Region of Cloud Run and Artifact Registry (GCP_REGION)."
  type        = string
  default     = "asia-southeast1"
}

variable "gateway_image" {
  description = "The api-gateway image Cloud Run runs (the ingress container): <region>-docker.pkg.dev/<project>/lmwn/api-gateway:<commit>."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9.-]+(:[0-9]+)?/[a-z0-9._/-]+(:[A-Za-z0-9._-]+|@sha256:[0-9a-f]{64})$", var.gateway_image))
    error_message = "gateway_image must be an image reference with a tag or digest."
  }
}

variable "data_server_image" {
  description = "The provided data server's image (the sidecar): <region>-docker.pkg.dev/<project>/lmwn/data-server:<commit>."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9.-]+(:[0-9]+)?/[a-z0-9._/-]+(:[A-Za-z0-9._-]+|@sha256:[0-9a-f]{64})$", var.data_server_image))
    error_message = "data_server_image must be an image reference with a tag or digest."
  }
}

variable "web_domain" {
  description = "The web app's custom domain on Firebase Hosting, such as hidden-gems.example.dev (domains.tf). Empty: none."
  type        = string
  default     = ""

  validation {
    condition     = var.web_domain == "" || can(regex("^([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}$", var.web_domain))
    error_message = "web_domain must be a lower-case host name, without scheme or path."
  }
}

variable "api_domain" {
  description = "The gateway's custom domain, mapped to the Cloud Run service, such as api-hidden-gems.example.dev (domains.tf). Empty: none."
  type        = string
  default     = ""

  validation {
    condition     = var.api_domain == "" || can(regex("^([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}$", var.api_domain))
    error_message = "api_domain must be a lower-case host name, without scheme or path."
  }
}

variable "dns_zone" {
  description = "The Cloudflare zone web_domain and api_domain are in. Set: Terraform verifies it for the deploy identity in Google Search Console and keeps the domains' DNS records there. Empty: DNS is managed by hand."
  type        = string
  default     = ""

  validation {
    condition     = var.dns_zone == "" || can(regex("^([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}$", var.dns_zone))
    error_message = "dns_zone must be a lower-case domain such as example.com."
  }
  validation {
    condition = var.dns_zone == "" || alltrue([
      for d in compact([var.web_domain, var.api_domain]) : endswith(d, ".${var.dns_zone}")
    ])
    error_message = "web_domain and api_domain must be inside dns_zone."
  }
}

variable "max_instances" {
  description = "Most Cloud Run instances at once. Each instance holds its own copy of the sample data, so any number works; the cap bounds cost."
  type        = number
  default     = 2

  validation {
    condition     = var.max_instances >= 1 && var.max_instances <= 10
    error_message = "max_instances must be between 1 and 10."
  }
}

variable "deletion_protection" {
  description = "Protect the Cloud Run service from terraform destroy."
  type        = bool
  default     = true
}
