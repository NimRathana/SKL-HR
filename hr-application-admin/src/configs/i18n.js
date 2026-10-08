import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../data/dictionaries/en.json';
import fr from '../data/dictionaries/fr.json';
import km from '../data/dictionaries/km.json';

i18n
  .use(LanguageDetector) // detects browser language
  .use(initReactI18next) // connects i18n with React
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      km: { translation: km },
    },
    fallbackLng: 'en', // default if user language not supported
    debug: false,
    interpolation: { escapeValue: false },
    detection: {
      // Order of detection attempts
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      // Where to store detected language
      caches: ['localStorage', 'cookie'],
      // Optional: cookie settings
      cookieMinutes: 10080, // 7 days
    },
  });

export default i18n;