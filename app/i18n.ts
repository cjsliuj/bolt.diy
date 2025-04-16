import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言资源
import commonZH from './locales/zh/common.json';
import commonEN from './locales/en/common.json';

// 语言资源
const resources = {
  en: {
    common: commonEN,
  },
  zh: {
    common: commonZH,
  },
};

console.log('[i18n] Initializing i18next...');
console.log('[i18n] Loaded resources:', resources);

i18n
  // 检测用户语言
  .use(LanguageDetector)
  // 将 i18n 实例传递给 react-i18next
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    resources,
    fallbackLng: 'zh', // 回退语言
    defaultNS: 'common', // 默认命名空间
    // lng: 'zh', // 移除显式设置 lng，让 LanguageDetector 决定初始语言
    debug: true, // 开启 i18next 调试模式以获取更详细的日志
    interpolation: {
      escapeValue: false, // 不转义 React 中的值
    },
    detection: {
      // 语言检测选项
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'bolt_language', // 确保 key 与 useSettings 中使用的一致
      caches: ['localStorage'],
    },
  }, (err, t) => {
    if (err) return console.error('[i18n] Error initializing i18next:', err);
    console.log('[i18n] i18next initialized successfully.');
    // @ts-ignore
    console.log('[i18n] Detected language:', i18n.language);
    // @ts-ignore
    console.log('[i18n] Example translation (common.save):', t('common.save'));
  });

// 监听语言变化事件
i18n.on('languageChanged', (lng) => {
  console.log(`[i18n] Language changed to: ${lng}`);
});

export default i18n; 