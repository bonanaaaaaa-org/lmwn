terraform {
  # The s3 backend's use_lockfile needs 1.10+; CI pins the exact version
  # (TERRAFORM_VERSION in .github/workflows/ci.yml).
  required_version = ">= 1.11.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.7"
    }
    # The Firebase project, Hosting site and custom domain are beta resources.
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 8.7"
    }
    # The custom domains' DNS records in the bonanaaaaaa.dev Cloudflare zone
    # (domains.tf), with the zone-scoped token repo-management publishes as
    # the prod environment secret CLOUDFLARE_API_TOKEN.
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.28"
    }
  }

  # State lives in the R2 bucket repo-management made for this repository,
  # under the prod key. Bucket, key, region and endpoint come from the GitHub
  # environment's TF_STATE_* variables through scripts/backend-init.sh; the R2
  # key pair only from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY. The settings
  # below are what R2 needs from the s3 backend; use_lockfile locks the state
  # with a lock object beside it.
  backend "s3" {
    use_path_style              = true
    use_lockfile                = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }
}
