// One place for everything you may want to change before (or after) going live.
export const SITE = {
  name: 'ship_it() Academy',
  tagline: 'Learn programming and system design by playing an incremental game.',
  // Your production URL, e.g. https://yourdomain.com or https://<user>.github.io/<repo>/ (used for sharing).
  url: 'https://YOUR_DOMAIN',
  // Your Buy Me a Coffee page. Replace YOUR_HANDLE with your username (https://www.buymeacoffee.com/<username>).
  supportUrl: 'https://www.buymeacoffee.com/brunofrigeri',
  supportLabel: 'Buy me a coffee',
  // Works on a custom domain (/) and on a GitHub Pages project URL (/<repo>/): Vite sets BASE_URL at build time.
  routes: { game: import.meta.env.BASE_URL, course: import.meta.env.BASE_URL + 'course/' },
};
