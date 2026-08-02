---
name: deploy-ninja-timer
description: Deploy the Ninja Timer app to production on Cloudflare Pages. Use when the user asks to deploy, push to prod, publish, go live, ship it, or release. The user is not familiar with DevOps terminology so always explain steps in plain language.
disable-model-invocation: true
---

# Deploy Ninja Timer to Production

The user is not a DevOps person. Never assume they know CLI commands, git workflows, or deployment jargon. Just do it and report status clearly.

## Production Environments

There are TWO sites deployed from the same codebase:

| Site | Cloudflare Project | URL | Build Command |
|------|-------------------|-----|---------------|
| Regular | `ninja-timer` | https://ninja-timer.pages.dev/ | `npm run build` → `dist/` |
| Finals | `ninja-timer-finals` | https://ninja-timer-finals.pages.dev/ | `npm run build:finals` → `dist-finals/` |

- **Deploy method**: Manual via `wrangler pages deploy` (NOT auto-deployed on git push)
- **Branch**: `master` on `origin` (GitHub)

## Deployment Steps (deploy BOTH sites)

### Regular site:

1. Build:
   ```
   npm run build
   ```

2. Deploy:
   ```
   npx wrangler pages deploy dist --project-name ninja-timer --branch master
   ```

### Finals site:

3. Build:
   ```
   npm run build:finals
   ```

4. Deploy:
   ```
   npx wrangler pages deploy dist-finals --project-name ninja-timer-finals --branch master
   ```

### Verify both:

5. Look for "Deployment complete!" in both deploy outputs.

**Always deploy BOTH sites** unless the user explicitly says to deploy only one.

## Important Notes

- `dist/` and `dist-finals/` are in `.gitignore` — Cloudflare does NOT auto-build from git. You must build locally and deploy with wrangler.
- Always build before deploying. The `dist/` and `dist-finals/` folders may be stale from a previous build.
- Git commit and push are separate from deployment. Commit keeps the code safe on GitHub; deploy pushes the built app to Cloudflare.
- The `--branch master` flag is required for BOTH projects. Using any other branch creates a Preview deployment only.
- The Cloudflare account ID is in `node_modules/.cache/wrangler/pages.json` — do not expose it.

## Pre-Deployment Checklist

Before deploying, verify:
- [ ] No errors in `npm run build`
- [ ] Dev server runs without console errors (`npm run dev`)
- [ ] Changes are committed to git (so code isn't lost)
- [ ] Changes are pushed to GitHub (backup)

## Rollback

If something breaks after deploy, redeploy the previous good build:
```
git stash
git checkout <previous-commit-hash>
npm run build
npx wrangler pages deploy dist --project-name ninja-timer --branch master
git checkout master
git stash pop
```

## Communication Style

When reporting deployment status to the user, use plain language:
- "Building the app..." (not "running vite build pipeline")
- "Uploading to the server..." (not "deploying to Cloudflare edge network")
- "It's live now at https://ninja-timer.pages.dev/" (not "deployment alias resolved")
