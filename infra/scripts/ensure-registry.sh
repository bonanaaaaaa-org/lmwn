#!/usr/bin/env bash
# Make sure the APIs and the Artifact Registry repository exist before the
# deploy job pushes images to it. On the first deploy this creates them; after
# that it changes nothing. The full plan and apply (apply.sh) follow the push,
# because the Cloud Run service needs the images to exist.
#
# Usage: ensure-registry.sh <terraform-dir> <var-file relative to it>
# Run after backend-init.sh, with the R2 key pair, Google credentials,
# TF_VAR_project_id, TF_VAR_region, TF_VAR_gateway_image and
# TF_VAR_data_server_image in the environment.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <terraform-dir> <var-file>" >&2
  exit 2
fi
tf_dir=$1
var_file=$2

# -target is Terraform's tool for exactly this bootstrap step; the next apply
# plans everything.
terraform -chdir="$tf_dir" apply -input=false -lock-timeout=5m -no-color -auto-approve \
  -var-file="$var_file" \
  -target=google_project_service.enabled \
  -target=google_artifact_registry_repository.images
