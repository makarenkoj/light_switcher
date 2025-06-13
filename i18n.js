import i18n from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

let currentFilename;
let currentDirname;

if (typeof __filename !== 'undefined' && typeof __dirname !== 'undefined') {
  currentFilename = __filename;
  currentDirname = __dirname;
} else if (typeof import.meta.url !== 'undefined') {
  try {
    currentFilename = fileURLToPath(import.meta.url);
    currentDirname = path.dirname(currentFilename);
  } catch (e) {
    console.warn('Failed to determine paths via import.meta.url:', e);
    currentFilename = process.cwd() + '/unknown-file.js';
    currentDirname = process.cwd();
  }
} else {
  console.warn('Could not determine file paths via Jest or import.meta.url. Using module.filename fallback.');
  if (typeof module !== 'undefined' && typeof module.filename !== 'undefined') {
       currentFilename = module.filename;
       currentDirname = path.dirname(currentFilename);
  } else {
      currentFilename = process.cwd() + '/ultimate-fallback.js';
      currentDirname = process.cwd();
  }
}

await i18n
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'ua',
    preload: ['en', 'ua'],
    backend: {
      loadPath: path.join(currentDirname, 'locales', '{{lng}}.json'),
    },
    detection: {
      order: ['querystring', 'cookie', 'header'],
      caches: ['cookie'],
    },
  });

  const t = i18n.t.bind(i18n);

export { i18n as default, t};
export const i18nMiddleware = middleware.handle(i18n);
