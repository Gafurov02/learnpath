import { getRequestConfig } from 'next-intl/server';
import en from './messages/en.json';
import ru from './messages/ru.json';

type Messages = typeof en;

const messages: Record<'en' | 'ru', Messages> = { en, ru };

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? 'en';
  const activeLocale = locale === 'ru' ? 'ru' : 'en';
  return {
    locale: activeLocale,
    timeZone: 'UTC',
    messages: messages[activeLocale],
  };
});
