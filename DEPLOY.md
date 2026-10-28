# Deploy the portfolio site to GitHub Pages

Instructions for a coding agent. Sahil wants the site hosted on **GitHub Pages**, built
and deployed automatically by a GitHub Actions workflow on every push to `master`.

## Rules for this job

- **Ask Sahil before:** pushing to GitHub, renaming the repository, deleting any file,
  or changing repository settings. Put all your questions in one numbered list.
- Never write a token or secret into a file.
- Don't change the site's look or content. This job only gets the current site online.
- Verify, don't assume: action versions, Node requirements and GitHub settings pages
  change. Check them before relying on the versions written here, and say what changed.

## The project

| | |
|---|---|
| Repository | `sahilsahran/port-2-0` (GitHub), default branch `master`. The account was renamed from `Cubeian` to `sahilsahran` on 2026-10-28 |
| Local copy | `C:\Documents\Projects\port-2-0` on Sahil's Windows PC |
| Stack | Vite 8, React 19, TypeScript, Tailwind v4. No router (one page), so no SPA 404 fallback is needed |
| Build | `npm ci` then `npm run build` (runs `tsc -b && vite build`), output in `dist/` |
| Static files | Everything in `public/` is copied to the site root and is **publicly reachable**, linked or not |
| Line endings | Source files use CRLF; keep them that way when editing |

Absolute paths into `public/` that the site uses today:

- `index.html`: `/favicon.svg`
- `src/App.tsx`: `/resume/sahil-sahran-resume.pdf` (twice) and `/documents/academic-history.pdf`
- `src/data/experiences.json`, the `files[].path` values:
  - `/Espra/espra-demo.mp4`
  - `/projects/espra/*.jpg`
  - `/projects/beehive/beehive-monitor-schematic.pdf`
  - `/projects/jpeg/jpeg-size-targeting-excerpts.pdf`
  - `/projects/tablet-stand/*.jpg`
  - `/projects/keyboard/*.jpg`
- `src/components/IDCard.tsx` imports `@/assets/photo.webp`. Vite bundles that import, so it
  needs no change.

## Step 1: Get the code onto GitHub

First, point the local repo at the renamed account. GitHub redirects the old `Cubeian` URLs
for now, but don't rely on that:

```sh
git remote -v
git remote set-url origin https://github.com/sahilsahran/port-2-0.git
git fetch origin
```

Sahil's internship repo on the same PC (`C:\Documents\Projects\internshipFinder`) moved
too. Update it the same way:
`git remote set-url origin https://github.com/sahilsahran/internshipFinder.git`.

Sahil's latest work is only on their PC and is not committed yet.

1. Run `git status` in the local copy and show Sahil a short summary of what's changed.
2. **Unused originals in `public/`.** These would go live but nothing links to them:
   - `public/Sahran_Sahil_Extended_Essay (1).pdf`
   - `public/BEES.pdf`
   - `public/Espra/ESPRA.jpg`, `Espra_upclosetop.jpg`, `espra_upclosebottom.jpg`
   - `public/Nanotronic/cuttingNoiseGraph.jpg`
   - `public/Tablet Stand/` (both photos)

   Ask Sahil whether to delete them or move them outside `public/`. **Keep
   `public/Espra/espra-demo.mp4`**: the site uses it. Optionally, move it to
   `public/projects/espra/espra-demo.mp4` and update its path in `experiences.json` to match.
3. Check that no file is over 100 MB (GitHub's limit). The demo video is about 31 MB.
4. Commit with a clear message. Ask before pushing, then `git push origin master`.

## Step 2: Choose the site address (ask Sahil)

A GitHub Pages site for a repo named `port-2-0` lives at
`https://sahilsahran.github.io/port-2-0/`. That subfolder breaks every absolute path above.
There are two ways to handle it. Ask Sahil which one they want:

**A. Rename the repo to `sahilsahran.github.io` (recommended, simplest).**
- The site lives at `https://sahilsahran.github.io/`, and no code changes are needed (`base` stays `/`).
- Sahil renames it under the repo's Settings > General > Repository name. GitHub redirects the old URL.
- Afterwards, update the local remote:
  `git remote set-url origin https://github.com/sahilsahran/sahilsahran.github.io.git`
- Check first that Sahil doesn't already have a `sahilsahran.github.io` repo. The repo name must match the account name exactly.

**B. Keep the name `port-2-0`.**
1. In `vite.config.ts`, set `base: '/port-2-0/'`.
2. Add a helper, e.g. in `src/lib/utils.ts`:
   ```ts
   export const asset = (p: string) => import.meta.env.BASE_URL + p.replace(/^\//, "");
   ```
3. Wrap every public path with it: the resume and transcript URLs in `App.tsx`, and every
   place that reads `file.path` from `experiences.json`. Search the components for `.path`
   (ExperienceSidebar, PDFViewerPanel and ExperiencesPanel all use it). Wrap the paths
   where they're used, not in the JSON.
4. Leave `/favicon.svg` in `index.html` as it is: Vite rewrites it with `base` at build time.
5. Skip YouTube URLs (type `youtube`). They're external.
6. Run `npm run build && npx vite preview`. Open `http://localhost:4173/port-2-0/` and check
   every attachment.

## Step 3: Add the deploy workflow

Create `.github/workflows/deploy.yml`. This is GitHub's standard Vite-to-Pages pattern.
Check the current major versions of each action before using it:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22   # Vite 8 needs Node 20.19+ or 22.12+
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Before pushing, run `npm ci && npm run build` locally. It must pass, because `tsc -b` runs
in CI. If `npm ci` complains that the lock file is out of sync, run `npm install` and commit
`package-lock.json`.

## Step 4: Turn on Pages

Sahil (or you, with their OK) goes to the repo's **Settings > Pages > Build and deployment >
Source** and picks **GitHub Actions**. Then push, or run the workflow from the Actions tab.

## Step 5: Verify the live site

1. The Actions run is green, and the Pages URL loads with no console errors.
2. Watch for case sensitivity. Sahil's PC ignores letter case but GitHub Pages doesn't, so
   `/Espra/...` must match the folder name exactly. Open **every** attachment of every
   experience:
   - the ESPRA video and photos
   - the beehive schematic and the JPEG excerpts PDF
   - the tablet-stand and keyboard photos
3. Open the Resume and Transcript buttons. Each PDF should open in the viewer and also
   download directly at its URL.
4. Check the page on a phone-sized screen.
5. Send Sahil the live URL and a list of anything that didn't load.

## Not part of this job

- A custom domain costs money. Only mention it as an option.
- Content or design changes.
