# Infrastructure

Terraform for lmwn's prod Google Cloud project, and the scripts CI runs to deploy it. It follows [bonanaaaaaa-org/personal-finance's `infra/`](https://github.com/bonanaaaaaa-org/personal-finance/tree/main/infra): Terraform state on R2, the web app on a Firebase Hosting custom domain, the API on a Cloud Run domain mapping, and Cloudflare DNS records with zone verification.

- Web app: https://hidden-gems.bonanaaaaaa.dev (Firebase Hosting)
- Gateway: https://api-hidden-gems.bonanaaaaaa.dev (Cloud Run)
- Storybook: https://storybook-hidden-gems.bonanaaaaaa.dev (Firebase Hosting, its own site)

## Who provides what

[bonanaaaaaa-org/repo-management](https://github.com/bonanaaaaaa-org/repo-management) (bonanaaaaaa-org/repo-management#76, #77, #81) provides:

- the projects `lmwn-prod-df7136` (billed) and `lmwn-pr-df7136` (not billed) in `asia-southeast1`;
- a deploy service account per project with `roles/owner` on its own project only. A job reaches it through workload identity federation only if it declares `environment: prod` (or `pr`). No key exists. Owner rather than Editor because Terraform creates the runtime service account and makes the service public;
- the R2 bucket for the Terraform state, with one key per environment;
- the prod environment variables `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_SERVICE_ACCOUNT`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `TF_STATE_BUCKET`, `TF_STATE_ENDPOINT`, `TF_STATE_KEY`, `TF_STATE_REGION` and `TF_STATE_WORKSPACE_PREFIX`; the repository secrets `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (state bucket only); and the prod environment secret `CLOUDFLARE_API_TOKEN`, which may edit `bonanaaaaaa.dev`'s DNS records and nothing else;
- a deployment branch policy on `prod`: only `main` may use prod's identity and secrets.

This directory defines the rest, as one root module applied to prod:

| File | What |
|---|---|
| `main.tf` | APIs (enabled here too, so the module stands alone), labels, the project number |
| `registry.tf` | Artifact Registry repository `lmwn`. It keeps the 5 newest versions of each image and deletes others after 7 days |
| `run.tf` | Cloud Run service `api-gateway` (below) |
| `iam.tf` | Runtime service account `api-gateway-run`, with `roles/logging.logWriter` only (neither container calls a Google API) |
| `firebase.tf` | Firebase on the project, the default Hosting site `https://lmwn-prod-df7136.web.app` (web app), and the site `https://lmwn-prod-df7136-storybook.web.app` (Storybook) |
| `domains.tf` | The custom domains, their Cloudflare records and the zone's Search Console verification (below) |
| `env/prod.tfvars` | The domains and zone |
| `tests/` | `terraform test` with mock providers: what prod plans, without cloud access |
| `scripts/` | `backend-init.sh` (copied from personal-finance), `ensure-registry.sh`, `build-images.sh`, `apply.sh`, `deploy-hosting.sh`, `smoke-test.sh` |

## Cloud Run: the gateway and the data server as a sidecar

The provided data server listens on three ports (guides `:8888`, restaurants `:9999`, images `:7777`), and a Cloud Run service exposes one. So there is one service with two containers that share the instance's `localhost`:

- **`api-gateway`** (`api-gateway/Dockerfile`) is the ingress container on port 8080. Its startup probe is `GET /health`, and it starts after the sidecar is ready (`depends_on`). Settings: `GUIDE_SERVICE_URL`, `RESTAURANT_SERVICE_URL` and `PHOTO_SERVICE_URL` point at `localhost`; `PUBLIC_BASE_URL` is the API domain; `CORS_ALLOWED_ORIGINS` is set as below.
- **`data-server`** (`api-gateway/data-server.Dockerfile`) is the sidecar and exposes no port. Its MongoDB binary is downloaded when the image is built, so a cold start never downloads it. Each instance seeds its own in-memory copy of the sample data. Its startup probe is a TCP check on 8888.
- **Second-generation execution environment**, for mongod and sharp.
- **Scaling:** zero instances when idle, at most `max_instances` (2). CPU runs only during requests, with startup CPU boost. The gateway gets 1 vCPU and 512 MiB, the data server 1 vCPU and 1 GiB (for mongod). The request timeout is 30 s.
- **Anyone may invoke it** (`invoker_iam_disabled`): it is a public read-only API for a browser app.
- **Images** are tagged with the commit and pushed before the apply (`scripts/build-images.sh`). Terraform runs them (`TF_VAR_gateway_image`, `TF_VAR_data_server_image`). A tag that is already in the registry is not rebuilt, so re-running a deploy for the same commit plans no changes.

**Photos.** The data server's photo URLs point at `localhost:7777`, which browsers can't reach. The gateway serves photos itself on `GET /photos/r/{width}/{height}/{file}`, and rewrites photo URLs to `PUBLIC_BASE_URL` (api-gateway/README.md).

**CORS.** The gateway allows `https://hidden-gems.bonanaaaaaa.dev`. Until Hosting reports that domain active with its certificate (`web_domain_ready`, read when each deploy plans), it also allows `https://lmwn-prod-df7136.web.app`. Once the domain is ready, the next deploy removes the web.app origin.

## Firebase Hosting

Hosting serves `web/build/client`, built in the deploy job with `VITE_API_BASE_URL` set to the API domain. `web/firebase.json` rewrites every path except `/assets/**` to `/index.html` (the SPA), so a missing hashed file answers 404 rather than an immutably cached page. It sends `Cache-Control: no-cache` everywhere, and `public, max-age=31536000, immutable` for the content-hashed `/assets/**` (the later matching rule wins), plus `X-Content-Type-Options: nosniff` and `Referrer-Policy`. Terraform only creates the site. The Firebase CLI (pinned in `scripts/deploy-hosting.sh`) uploads the files, authenticated through the same workload identity.

**Storybook.** A second site, `lmwn-prod-df7136-storybook`, serves the static Storybook (`web/storybook-static`, from `pnpm build-storybook`). `web/firebase.json` lists both sites as hosting targets, `web` and `storybook`. `deploy-hosting.sh` writes an uncommitted `web/.firebaserc` that maps them to the site IDs from Terraform's outputs (`hosting_site_id`, `storybook_site_id`), then deploys both in one `firebase deploy`. The Storybook sends `no-cache` everywhere and `public, max-age=31536000, immutable` for the hashed `/assets/**`. It also sends `X-Robots-Tag: noindex, nofollow` (kept out of search results), `nosniff` and `Referrer-Policy`. It has no rewrites, so a missing file is 404. Stories use fixtures only. The script refuses a Storybook build that contains the API host, and the gateway doesn't allow the Storybook's origins.

## Custom domains

Terraform creates the Hosting custom domains (`web_domain`, `storybook_domain`), the Cloud Run domain mapping (`api_domain`), and their records in the Cloudflare zone `bonanaaaaaa.dev`. All records are **DNS only**, not proxied, so Google can issue the certificates:

- `hidden-gems`: `A 199.36.158.100` and `TXT "hosting-site=lmwn-prod-df7136"` (Firebase Hosting);
- `storybook-hidden-gems`: `A 199.36.158.100` and `TXT "hosting-site=lmwn-prod-df7136-storybook"` (Firebase Hosting, the Storybook's site);
- `api-hidden-gems`: `CNAME ghs.googlehosted.com` (Cloud Run);
- a `google-site-verification=…` TXT at the apex, for lmwn's deploy identity. It sits beside personal-finance's own TXT. With it, the identity verifies `bonanaaaaaa.dev` through the Site Verification API, which Cloud Run requires before it maps `api-hidden-gems`.

The output `custom_domain_dns_records` lists what Hosting and Cloud Run ask for, so you can compare it with these records. A domain mapping's name is the domain, so it can't be replaced in place: `scripts/apply.sh` untaints a mapping that a failed apply left tainted. To change the domain, delete the old mapping first.

**First deploy.** The certificates take minutes to a few hours to issue, and `.dev` is HTTPS only, so nothing serves on the domains until then. The first deploy's smoke test and Playwright run fail until the certificates exist. The Storybook domain is handled without a re-run: until Hosting reports it active with its certificate (`storybook_domain_ready`, read when each deploy plans), the deploy job checks the Storybook on `https://lmwn-prod-df7136-storybook.web.app`, which serves the same release, and warns. Every check still has to pass there. The first deploy after the certificate is issued checks the domain itself. If the domain is still not ready a day after it was created (`storybook_domain_created`), the job fails. For the web and API domains: once Firebase console → Hosting shows the domain active and `gcloud beta run domain-mappings describe --domain api-hidden-gems.bonanaaaaaa.dev --region asia-southeast1` shows `Ready`, re-run the **Deploy prod** job. Don't add these records by hand: Cloudflare refuses duplicates. Delete a hand-made record with the same name and type first, or import it.

## Pipeline (`.github/workflows/ci.yml`)

- **Pull requests:** Verify (which also builds the Storybook and runs the story tests), E2E and **Infrastructure checks** (`terraform fmt -check`, `validate`, `test` with mock providers, `shellcheck`). None of them has credentials. The pr project isn't billed, so nothing deploys from pull requests, and prod isn't planned before a merge.
- **Push to `main`:** the same checks, then **Deploy prod** (`environment: prod`), which runs one at a time and is never cancelled half-way. It:
  1. stops if `main` has moved on since this commit;
  2. installs dependencies (before any credential exists in the job);
  3. authenticates with `google-github-actions/auth` (no keys);
  4. initialises Terraform on the R2 state;
  5. makes sure the registry exists (`ensure-registry.sh`, a targeted apply that changes nothing after the first run);
  6. builds and pushes the images;
  7. plans and applies (the plan's changes go to the job summary);
  8. deploys the web app and the Storybook to Hosting in one `firebase deploy`. Both were built before authentication: the web app with `VITE_API_BASE_URL` set to the API domain in `env/prod.tfvars` (`deploy-hosting.sh` checks the bundle against the `api_url` output), and the Storybook with fixtures only (the script checks that it doesn't contain the API host). A Storybook build or deploy failure fails the job;
  9. removes the Google credentials file, then runs `scripts/smoke-test.sh` and the Playwright suite against the deployed site and Storybook (`PLAYWRIGHT_BASE_URL`, `API_BASE_URL`, `STORYBOOK_URL`). The suite's `specs/storybook.spec.ts` renders every story and fails on an error display, a failed request, or any request off the Storybook's origin.

Only the Terraform steps hold the R2 key pair and the Cloudflare token.

A re-run for the same commit plans no changes. The one exception is the deploy after the web domain becomes ready, which removes the web.app origin from CORS once.

## Running Terraform locally

Without credentials:

```sh
terraform -chdir=infra init -backend=false && terraform -chdir=infra validate && terraform -chdir=infra test
terraform fmt -check -recursive infra
```

Plans need the state credentials and Google credentials for the project. Never apply prod from a laptop: the deploy job applies it.

The images can be checked locally from the repository root:

```sh
docker build -f api-gateway/data-server.Dockerfile -t data-server .
docker build -f api-gateway/Dockerfile -t api-gateway .
docker run -d --name ds -p 8080:8080 data-server
docker run -d --name gw --network container:ds -e PUBLIC_BASE_URL=http://localhost:8080 api-gateway
curl localhost:8080/guides   # photo URLs on http://localhost:8080/photos/...
```

## Cost (about $0 a month)

- Cloud Run scales to zero and uses request-based CPU. A demo's traffic stays inside the monthly free tier. Both containers count while an instance runs.
- Artifact Registry: 0.5 GB free. The cleanup policy keeps a few versions of each image.
- Hosting: 10 GB of storage and 10 GB of transfer a month free. Custom domains, certificates and Cloud Run domain mappings are free.
