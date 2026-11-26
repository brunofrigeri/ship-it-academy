import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = p => fileURLToPath(new URL(p, import.meta.url));

// Two pages: the game at / and the course at /course/.
// BASE_PATH is set by the GitHub Pages workflow: '/' for a custom domain or <user>.github.io, '/<repo>/' otherwise.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: { game: r('./index.html'), course: r('./course/index.html') },
    },
  },
});
