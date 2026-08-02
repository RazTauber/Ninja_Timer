---
name: deploy-ninja-timer
description: Deploy the Ninja Timer app to production on Cloudflare Pages. Use when the user asks to deploy, push to prod, publish, go live, ship it, or release. The user is not familiar with DevOps terminology so always explain steps in plain language.
disable-model-invocation: true
---

# Deploy Ninja Timer to Production

The user is not a DevOps person. Never assume they know CLI commands, git workflows, or deployment jargon. Just do it and report status clearly.

## Production Environment

- **Host**: Cloudflare Pages
- **Project name**: `ninja-timer`
- **Live URL**: https://ninja-timer.pages.dev/
- **Deploy method**: Manual via `wrangler pages deploy` (NOT auto-deployed on git push)
- **Build tool**: Vite (`npm run build` → outputs to `dist/`)
- **Branch**: `master` on `origin` (GitHub)

## Deployment Steps

1. **Build** the production bundle:
   ```
   npm run build
   ```
   Verify output: `dist/` folder with `.html`, `.js`, `.css` files. A chunk size warning for xlsx is expected and harmless.

2. **Deploy** to Cloudflare Pages production:
   ```
   npx wrangler pages deploy dist --project-name ninja-timer --branch master
   ```
   The `--branch master` flag is required to deploy to the main production URL. The Cloudflare Pages project is configured with `master` as the production branch. Using any other branch name (including "production") results in a Preview deployment only.

3. **Verify** deployment succeeded — look for:
   ```
   ✨ Deployment complete!
   ✨ Deployment alias URL: https://production.ninja-timer.pages.dev
   ```

## Important Notes

- `dist/` is in `.gitignore` — Cloudflare does NOT auto-build from git. You must build locally and deploy with wrangler.
- Always `npm run build` before deploying. The `dist/` folder may be stale from a previous build.
- Git commit and push are separate from deployment. Commit keeps the code safe on GitHub; deploy pushes the built app to Cloudflare.
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
