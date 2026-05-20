# CI/CD

This repository now includes GitHub Actions pipelines under [`.github/workflows`](/C:/Users/cni.alad/Documents/Projects/Projects/Cicosy-CRM/ai-native-crm/.github/workflows).

## Workflows

### `ci.yml`
Runs on pushes to `main`, pushes to `codex/**`, and all pull requests.

It validates:

- frontend build with `npm ci` and `npm run build`
- backend verification with `mvn test`
- AI service source compilation with `python -m compileall ai-service/app`

### `cd.yml`
Runs on pushes to `main` and manual dispatch.

It publishes:

- frontend production build as a GitHub Actions artifact named `frontend-dist`
- backend Docker image to GHCR as:
  - `ghcr.io/<owner>/ai-native-crm-backend:latest`
  - `ghcr.io/<owner>/ai-native-crm-backend:<sha>`
- AI service Docker image to GHCR as:
  - `ghcr.io/<owner>/ai-native-crm-ai-service:latest`
  - `ghcr.io/<owner>/ai-native-crm-ai-service:<sha>`

## Notes

- The CD workflow currently publishes images and artifacts; it does not deploy to a hosting target yet.
- If you want automatic deployment later, the clean next step is adding an environment-specific job that pulls the published GHCR images and rolls them out to your target server, VPS, or container platform.
