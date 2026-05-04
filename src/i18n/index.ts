/**
 * i18n — Turkish-first localization.
 *
 * The app ships Turkish-only per the spec, but i18n-js gives us:
 *   1. A single source of truth for every string in the app
 *   2. Easy proofreading (one file)
 *   3. Future-proofing if we ever add another language
 *
 * Usage:
 *   import { t } from '@/i18n';
 *   <Text>{t('auth.login.title')}</Text>
 *   <Text>{t('home.welcomeBack', { name: 'Ali' })}</Text>
 */

import { I18n } from 'i18n-js';
import tr from './tr';

const i18n = new I18n({ tr });
i18n.defaultLocale = 'tr';
i18n.locale        = 'tr';
i18n.enableFallback = true;
i18n.missingBehavior = 'guess';  // shows the key name if missing — easier to spot in dev

export function t(key: string, options?: object): string {
  return i18n.t(key, options);
}

export default i18n;
