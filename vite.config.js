import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyStaticAssetsPlugin() {
  return {
    name: 'copy-static-images',
    closeBundle() {
      const srcDir = path.resolve(__dirname, 'src/assets/images');
      const destDir = path.resolve(__dirname, 'dist/src/assets/images');
      if (fs.existsSync(srcDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        for (const file of fs.readdirSync(srcDir)) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      }
      const faviconSrc = path.resolve(__dirname, 'favicon.svg');
      const faviconDest = path.resolve(__dirname, 'dist/favicon.svg');
      if (fs.existsSync(faviconSrc)) {
        fs.copyFileSync(faviconSrc, faviconDest);
      }
    },
  };
}

function cleanNauticalRoutesPlugin() {
  const routeMap = {
    '/watch': '/quotes.html',
    '/quotes': '/quotes.html',
    '/darkroom': '/gallery.html',
    '/gallery': '/gallery.html',
    '/logbook': '/blog.html',
    '/blog': '/blog.html',
  };
  return {
    name: 'clean-nautical-routes',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          const [pathname, query] = req.url.split('?');
          const clean = pathname.toLowerCase().replace(/\/+$/, '');
          if (routeMap[clean]) {
            req.url = routeMap[clean] + (query ? `?${query}` : '');
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    publicDir: false,
    plugins: [tailwindcss(), copyStaticAssetsPlugin(), cleanNauticalRoutesPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          quotes: path.resolve(__dirname, 'quotes.html'),
          gallery: path.resolve(__dirname, 'gallery.html'),
          blog: path.resolve(__dirname, 'blog.html'),
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
