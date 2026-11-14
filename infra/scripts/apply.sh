#!/usr/bin/env bash
# Plan and apply infra/, then export the outputs the later deploy steps need
# to $GITHUB_ENV (API_URL, WEB_URL, HOSTING_URL, HOSTING_SITE_ID, SERVICE_URL,
# STORYBOOK_URL, STORYBOOK_HOSTING_URL, STORYBOOK_SITE_ID,
# STORYBOOK_DOMAIN_READY, STORYBOOK_DOMAIN_CREATED),
# so they need no state access themselves. None of them is secret.
#
# Usage: apply.sh <terraform-dir> <var-file relative to it>
# Run after backend-init.sh and build-images.sh, with the R2 key pair, Google
# credentials, CLOUDFLARE_API_TOKEN and the TF_VAR_* settings in the
# environment.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <terraform-dir> <var-file>" >&2
  exit 2
fi
tf_dir=$1
var_file=$2

# The saved plan is private to this runner and removed on exit.
umask 077
plan=$(mktemp "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/tfplan.XXXXXX")
trap 'rm -f "$plan"' EXIT

# A tainted Cloud Run domain mapping can never be replaced in place (the
# replacement has the same name, the domain), so one a failed apply left
# tainted is kept, and the plan's refresh reads what Cloud Run has
# (personal-finance's apply.sh does the same).
mapping='google_cloud_run_domain_mapping.api[0]'
if terraform -chdir="$tf_dir" state pull |
  jq -e '.resources[]? | select(.type == "google_cloud_run_domain_mapping" and .name == "api")
    | .instances[]? | select(.status == "tainted")' >/dev/null; then
  terraform -chdir="$tf_dir" untaint -lock-timeout=5m "$mapping"
fi

terraform -chdir="$tf_dir" plan -input=false -lock-timeout=5m -no-color \
  -var-file="$var_file" -out="$plan"
if [[ -n ${GITHUB_STEP_SUMMARY:-} ]]; then
  {
    echo "### Terraform changes ($var_file)"
    echo '```'
    terraform -chdir="$tf_dir" show -json "$plan" |
      jq -r '[.resource_changes[]? | select(.change.actions != ["no-op"])] |
        if length == 0 then "No changes." else .[] | "\(.change.actions | join(",")) \(.address)" end'
    echo '```'
  } >>"$GITHUB_STEP_SUMMARY"
fi
terraform -chdir="$tf_dir" apply -input=false -lock-timeout=5m -no-color "$plan"

out=${GITHUB_ENV:-/dev/stdout}
# One NAME=value line per output; values never contain a newline, which would
# break $GITHUB_ENV's format.
terraform -chdir="$tf_dir" output -json | jq -r '
  {
    API_URL: .api_url.value,
    WEB_URL: .web_url.value,
    HOSTING_URL: .hosting_url.value,
    HOSTING_SITE_ID: .hosting_site_id.value,
    SERVICE_URL: .service_url.value,
    STORYBOOK_URL: .storybook_url.value,
    STORYBOOK_HOSTING_URL: .storybook_hosting_url.value,
    STORYBOOK_SITE_ID: .storybook_site_id.value,
    STORYBOOK_DOMAIN_READY: .storybook_domain_ready.value,
    STORYBOOK_DOMAIN_CREATED: .storybook_domain_created.value
  }
  | to_entries[]
  | (if .value == null then "" else .value end | tostring | gsub("[\r\n]"; "")) as $v
  | "\(.key)=\($v)"
' >>"$out"
