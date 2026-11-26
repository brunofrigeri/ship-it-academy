# ship_it() Academy

Learn programming and system design by playing an incremental game.

- **`/`, the game.** Write code with blocks, then found startups (Twitter-, Instagram-, Discord-, Netflix-style…) and design their architecture on a drag-and-drop canvas.
- **`/course/`, the course.** A 14-day system design roadmap with animated lessons, a sandbox, mock rounds, flashcards and quizzes.

A static site built with [Vite](https://vite.dev) and published with **GitHub Pages**. No backend: progress is saved in the visitor's browser (localStorage).

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173 (game) and http://localhost:5173/course/
npm run build      # production build into dist/
npm run preview    # serve dist/ to check the production build
```

Node 20 or newer.

## Publish on GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the site and publishes it on every push to `main`.

1. Create a repository on GitHub (for example `ship-it-academy`) and push this folder:
   ```bash
   git init && git add . && git commit -m "ship_it() Academy"
   git branch -M main
   git remote add origin https://github.com/<you>/ship-it-academy.git
   git push -u origin main
   ```
2. In the repository, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. Open the **Actions** tab. The "Deploy to GitHub Pages" run publishes the site (re-run it if the first push happened before step 2).

Without a custom domain the site lives at `https://<you>.github.io/ship-it-academy/`. The workflow detects this and builds with the right base path automatically.

## Use your own domain

Yes, GitHub Pages supports custom domains, with free HTTPS.

1. **Tell the build.** In the repository, open **Settings → Secrets and variables → Actions → Variables** and add a variable `CUSTOM_DOMAIN` with your domain (for example `academy.example.com`). This makes the site build for the domain root.
2. **Add the domain in Pages.** In **Settings → Pages → Custom domain**, enter the same domain and save.
3. **Point DNS at GitHub** at your domain registrar:
   - **Subdomain** (e.g. `academy.example.com` or `www.example.com`): a `CNAME` record pointing to `<you>.github.io`.
   - **Apex domain** (e.g. `example.com`): `A` records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`. Optionally also `AAAA` records for IPv6: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`. Adding a `www` subdomain as well is recommended.
4. **Turn on HTTPS.** Once the DNS check passes, tick **Enforce HTTPS** in the Pages settings. The certificate can take a little while to be issued.
5. Re-run the deploy workflow (Actions → Deploy to GitHub Pages → Run workflow) so the build picks up `CUSTOM_DOMAIN`.

Tip: verify your domain under your GitHub account settings (Pages → Verified domains) to protect it from takeovers.

## Before you go live

| What | Where |
|---|---|
| Buy Me a Coffee link | `src/site.config.js` → `supportUrl` (replace `YOUR_HANDLE`) |
| Site name, tagline, public URL | `src/site.config.js` |
| Page titles and descriptions | `<head>` of `index.html` and `course/index.html` |
| Favicon | `public/favicon.svg` |

## Project layout

```
index.html                 Game page (/)
course/index.html          Course page (/course/)
public/                    Static files copied as-is (favicon, robots.txt)
.github/workflows/         GitHub Pages build and deploy
src/site.config.js         Name, links, support URL, routes (base-path aware)
src/shared/                Buy Me a Coffee button and styles, shared by both pages
src/game/
  main.js                  Game UI: code phase, startup phase, Library, Study mode, course overlay
  engine.js                Block-program interpreter and challenge scoring
  sim.js                   Traffic simulation: request kinds, components, startups
  course-data.js           Builds the game's Library from the course content (single source of truth)
  game.css                 Game styles and theme
src/course/
  main.js                  Course entry: loads the scripts below in order
  app.js                   Course app: routing, pages, search, recall
  names.js                 ship_it() names for days, lessons, deep dives and animated scenes
  iso.js, scenes-*.js      Scene renderer (flat "systems board") and the animated lessons
  content-*.js, extras*.js Lessons, quizzes, flashcards, deep dives
  exercises-*.js, rubrics.js, needs.js, widgets.js
  style.css, theme.css     Course styles and the ship_it() theme
```

## How the two pages work together

- **Switching never resets the game.** From the game, the course opens in a full-screen layer on top of the game page, so the game stays in memory and its loop is paused until you press ⚡ Game again. Visiting `/course/` directly works as a normal page.
- **Library vs course.** The game's 📖 Library is the quick reference: component cards, concepts, cheat sheets, flashcards and quick checks. Full lessons open in the course at the exact lesson.
- Both pages share the same origin, so the game picks up the course's dark/light setting.
- Saves live in localStorage under `shipit-v1` (game) and `two-weeks-to-scale-v2` (course). Clearing site data resets progress.
