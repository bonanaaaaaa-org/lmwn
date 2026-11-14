#!/usr/bin/env bash
# Build and push the two images Cloud Run runs, tagged with the commit:
#   TF_VAR_gateway_image      <- api-gateway/Dockerfile
#   TF_VAR_data_server_image  <- api-gateway/data-server.Dockerfile
# An image whose tag is already in the registry (a re-run of the same commit)
# is not rebuilt, so the re-run's plan sees the same images and changes
# nothing.
#
# Usage: build-images.sh   (from the repository root)
# Environment: TF_VAR_gateway_image, TF_VAR_data_server_image, GITHUB_SHA;
# gcloud authenticated.
set -euo pipefail

gateway_image=${TF_VAR_gateway_image:-}
data_server_image=${TF_VAR_data_server_image:-}
for name in TF_VAR_gateway_image TF_VAR_data_server_image GITHUB_SHA; do
  if [[ -z ${!name:-} ]]; then
    echo "build-images: $name is not set" >&2
    exit 2
  fi
done

registry_host=${gateway_image%%/*}
gcloud auth configure-docker "$registry_host" --quiet

# build IMAGE DOCKERFILE
build() {
  local image=$1 dockerfile=$2
  if gcloud artifacts docker images describe "$image" --quiet >/dev/null 2>&1; then
    echo "$image is already in the registry; not rebuilt."
    return 0
  fi
  # Cloud Run runs linux/amd64 (as do the CI runners; a Mac may be arm64).
  # Without provenance the push is one plain image manifest.
  docker buildx build --pull --push --provenance=false \
    --platform linux/amd64 \
    --label "org.opencontainers.image.revision=$GITHUB_SHA" \
    --label "org.opencontainers.image.source=${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}" \
    -f "$dockerfile" -t "$image" .
}

build "$data_server_image" api-gateway/data-server.Dockerfile
build "$gateway_image" api-gateway/Dockerfile

if [[ -n ${GITHUB_STEP_SUMMARY:-} ]]; then
  {
    echo "### Images"
    echo "- \`$gateway_image\`"
    echo "- \`$data_server_image\`"
  } >>"$GITHUB_STEP_SUMMARY"
fi
