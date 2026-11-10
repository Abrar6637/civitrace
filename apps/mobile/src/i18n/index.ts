import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DevSettings, I18nManager } from 'react-native';
import { en } from './locales/en';
import { ur } from './locales/ur';

export type Language = 'ur' | 'en';

const LANGUAGE_KEY = 'civitrace.language';

// Saves the text direction. Native code applies it the next time the app starts.
function saveDirection(lng: Language) {
  const rtl = lng === 'ur';
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return I18nManager.isRTL !== rtl; // true = a restart is still needed
}

// Starts i18n with the saved language (Urdu by default).
// It never reloads the app during startup: reloading while the app is still loading can crash Expo Go.
export async function initI18n() {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  const lng: Language = saved === 'en' ? 'en' : 'ur';

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: { ur: { translation: ur }, en: { translation: en } },
      lng,
      fallbackLng: 'ur',
      interpolation: { escapeValue: false },
    });
  }

  return { needsRestart: saveDirection(lng) };
}

// Called when the user picks a language. The app reloads once, after the choice is saved.
export async function changeLanguage(lng: Language) {
  await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  await i18n.changeLanguage(lng);

  if (saveDirection(lng)) {
    // Give the screen time to finish before reloading (development builds only;
    // release builds will use expo-updates for this)
    setTimeout(() => DevSettings.reload(), 400);
  }
}

export default i18n;