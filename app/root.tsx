import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';

// 导入i18n配置
import './i18n';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from './i18n';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  // 在 Layout 加载时添加日志，检查 i18n 状态
  useEffect(() => {
    console.log(`[Layout] Mounted. Current i18n language: ${i18n.language}`);
    console.log(`[Layout] Is i18n initialized? ${i18n.isInitialized}`);
  }, []);

  return (
    <>
      <ClientOnly>
        {() => (
          <I18nextProvider i18n={i18n}>
            <DndProvider backend={HTML5Backend}>{children}</DndProvider>
          </I18nextProvider>
        )}
      </ClientOnly>
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

import { logStore } from './lib/stores/logs';

export default function App() {
  const theme = useStore(themeStore);
  const { t, i18n: i18nInstance } = useTranslation(); // 获取 i18n 实例

  useEffect(() => {
    // 确保 i18n 实例已加载后再记录翻译和语言
    if (i18nInstance.isInitialized) {
        const currentLang = i18nInstance.language;
        const translatedText = t('common.save');
        console.log(`[App] useEffect: Detected language: ${currentLang}`);
        console.log(`[App] useEffect: Translation for 'common.save': ${translatedText}`);

        logStore.logSystem(t('common.loading'), {
          theme,
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          language: currentLang, // 添加当前语言到日志
        });
    } else {
        console.log('[App] useEffect: i18n not initialized yet.');
        // 可以考虑监听 initialized 事件
        const handleInitialized = () => {
            const currentLang = i18nInstance.language;
            const translatedText = t('common.save');
            console.log(`[App] useEffect (initialized event): Detected language: ${currentLang}`);
            console.log(`[App] useEffect (initialized event): Translation for 'common.save': ${translatedText}`);
            logStore.logSystem(t('common.loading'), {
              theme,
              platform: navigator.platform,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              language: currentLang,
            });
        }
        i18nInstance.on('initialized', handleInitialized);
        // 清理监听器
        return () => {
            i18nInstance.off('initialized', handleInitialized);
        }
    }
  }, [t, theme, i18nInstance]); // 添加 i18nInstance 到依赖

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
