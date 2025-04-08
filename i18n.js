import i18n from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await i18n
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'ua',
    preload: ['en', 'ua'],
    backend: {
      loadPath: path.join(__dirname, 'locales', '{{lng}}.json'),
    },
    detection: {
      order: ['querystring', 'cookie', 'header'],
      caches: ['cookie'],
    },
  });

  const t = i18n.t.bind(i18n);

export { i18n as default, t};
export const i18nMiddleware = middleware.handle(i18n);
