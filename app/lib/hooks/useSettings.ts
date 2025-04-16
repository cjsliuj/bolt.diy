import { useStore } from '@nanostores/react';
import {
  isDebugMode,
  isEventLogsEnabled,
  promptStore,
  providersStore,
  latestBranchStore,
  autoSelectStarterTemplate,
  enableContextOptimizationStore,
  tabConfigurationStore,
  updateTabConfiguration as updateTabConfig,
  resetTabConfiguration as resetTabConfig,
  updateProviderSettings as updateProviderSettingsStore,
  updateLatestBranch,
  updateAutoSelectTemplate,
  updateContextOptimization,
  updateEventLogs,
  updatePromptId,
} from '~/lib/stores/settings';
import { useCallback, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import type { IProviderSetting, ProviderInfo, IProviderConfig } from '~/types/model';
import type { TabWindowConfig, TabVisibilityConfig } from '~/components/@settings/core/types';
import { logStore } from '~/lib/stores/logs';
import { getLocalStorage, setLocalStorage } from '~/lib/persistence';
import i18n from '~/i18n';

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  eventLogs: boolean;
  timezone: string;
  tabConfiguration: TabWindowConfig;
}

export interface UseSettingsReturn {
  // Theme and UI settings
  setTheme: (theme: Settings['theme']) => void;
  setLanguage: (language: string) => void;
  setNotifications: (enabled: boolean) => void;
  setEventLogs: (enabled: boolean) => void;
  setTimezone: (timezone: string) => void;
  settings: Settings;

  // Provider settings
  providers: Record<string, IProviderConfig>;
  activeProviders: ProviderInfo[];
  updateProviderSettings: (provider: string, config: IProviderSetting) => void;

  // Debug and development settings
  debug: boolean;
  enableDebugMode: (enabled: boolean) => void;
  eventLogs: boolean;
  promptId: string;
  setPromptId: (promptId: string) => void;
  isLatestBranch: boolean;
  enableLatestBranch: (enabled: boolean) => void;
  autoSelectTemplate: boolean;
  setAutoSelectTemplate: (enabled: boolean) => void;
  contextOptimizationEnabled: boolean;
  enableContextOptimization: (enabled: boolean) => void;

  // Tab configuration
  tabConfiguration: TabWindowConfig;
  updateTabConfiguration: (config: TabVisibilityConfig) => void;
  resetTabConfiguration: () => void;
}

// Add interface to match ProviderSetting type
interface ProviderSettingWithIndex extends IProviderSetting {
  [key: string]: any;
}

export function useSettings(): UseSettingsReturn {
  const providers = useStore(providersStore);
  const debug = useStore(isDebugMode);
  const eventLogs = useStore(isEventLogsEnabled);
  const promptId = useStore(promptStore);
  const isLatestBranch = useStore(latestBranchStore);
  const autoSelectTemplate = useStore(autoSelectStarterTemplate);
  const [activeProviders, setActiveProviders] = useState<ProviderInfo[]>([]);
  const contextOptimizationEnabled = useStore(enableContextOptimizationStore);
  const tabConfiguration = useStore(tabConfigurationStore);
  const [settings, setSettings] = useState<Settings>(() => {
    const storedSettings = getLocalStorage('settings');
    const detectedLanguage = typeof window !== 'undefined' ? localStorage.getItem('bolt_language') : null;
    console.log(`[useSettings] Initializing: storedSettings=${JSON.stringify(storedSettings)}, detectedLanguage=${detectedLanguage}`);
    const initialLanguage = detectedLanguage || storedSettings?.language || 'en';
    console.log(`[useSettings] Initial language set to: ${initialLanguage}`);
    return {
      theme: storedSettings?.theme || 'system',
      language: initialLanguage,
      notifications: storedSettings?.notifications ?? true,
      eventLogs: storedSettings?.eventLogs ?? true,
      timezone: storedSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      tabConfiguration,
    };
  });

  useEffect(() => {
    const active = Object.entries(providers)
      .filter(([_key, provider]) => provider.settings.enabled)
      .map(([_k, p]) => p);

    setActiveProviders(active);
  }, [providers]);

  const saveSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      console.log(`[useSettings] Saving settings: ${JSON.stringify(updated)}`);
      setLocalStorage('settings', updated); 
      if (newSettings.language && typeof window !== 'undefined') {
        console.log(`[useSettings] Setting localStorage bolt_language to: ${newSettings.language}`);
        localStorage.setItem('bolt_language', newSettings.language);
      }
      return updated;
    });
  }, []);

  const updateProviderSettings = useCallback((provider: string, config: ProviderSettingWithIndex) => {
    updateProviderSettingsStore(provider, config);
  }, []);

  const enableDebugMode = useCallback((enabled: boolean) => {
    isDebugMode.set(enabled);
    logStore.logSystem(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    Cookies.set('isDebugEnabled', String(enabled));
  }, []);

  const setEventLogs = useCallback((enabled: boolean) => {
    updateEventLogs(enabled);
    logStore.logSystem(`Event logs ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const setPromptId = useCallback((id: string) => {
    updatePromptId(id);
    logStore.logSystem(`Prompt template updated to ${id}`);
  }, []);

  const enableLatestBranch = useCallback((enabled: boolean) => {
    updateLatestBranch(enabled);
    logStore.logSystem(`Main branch updates ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const setAutoSelectTemplate = useCallback((enabled: boolean) => {
    updateAutoSelectTemplate(enabled);
    logStore.logSystem(`Auto select template ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const enableContextOptimization = useCallback((enabled: boolean) => {
    updateContextOptimization(enabled);
    logStore.logSystem(`Context optimization ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const setTheme = useCallback(
    (theme: Settings['theme']) => {
      saveSettings({ theme });
    },
    [saveSettings],
  );

  const setLanguage = useCallback(
    (language: string) => {
      console.log(`[useSettings] setLanguage called with: ${language}`);
      console.log(`[useSettings] Current i18n language before change: ${i18n.language}`);
      saveSettings({ language });
      i18n.changeLanguage(language).then(() => {
        console.log(`[useSettings] i18n.changeLanguage('${language}') promise resolved.`);
        console.log(`[useSettings] Current i18n language after change: ${i18n.language}`);
      }).catch(err => {
        console.error(`[useSettings] i18n.changeLanguage failed for ${language}:`, err);
      });
    },
    [saveSettings],
  );

  const setNotifications = useCallback(
    (enabled: boolean) => {
      saveSettings({ notifications: enabled });
    },
    [saveSettings],
  );

  const setTimezone = useCallback(
    (timezone: string) => {
      saveSettings({ timezone });
    },
    [saveSettings],
  );

  useEffect(() => {
    const providers = providersStore.get();
    const providerSetting: Record<string, IProviderSetting> = {};
    Object.keys(providers).forEach((provider) => {
      providerSetting[provider] = providers[provider].settings;
    });
    Cookies.set('providers', JSON.stringify(providerSetting));
  }, [providers]);

  useEffect(() => {
    const currentLanguage = settings.language || 'en';
    console.log(`[useSettings] useEffect language sync check: settings.language=${currentLanguage}, i18n.language=${i18n.language}`);
    if (i18n.language !== currentLanguage) {
      console.log(`[useSettings] useEffect: Mismatch detected, calling i18n.changeLanguage(${currentLanguage})`);
      i18n.changeLanguage(currentLanguage).then(() => {
         console.log(`[useSettings] useEffect: i18n.changeLanguage(${currentLanguage}) promise resolved.`);
         if (typeof window !== 'undefined') {
           const lsLang = localStorage.getItem('bolt_language');
           console.log(`[useSettings] useEffect: Current localStorage bolt_language: ${lsLang}`);
           if (lsLang !== currentLanguage) {
              console.log(`[useSettings] useEffect: Updating localStorage bolt_language to ${currentLanguage}`);
              localStorage.setItem('bolt_language', currentLanguage);
           }
         }
      }).catch(err => {
         console.error(`[useSettings] useEffect: i18n.changeLanguage(${currentLanguage}) failed:`, err);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.language]);

  return {
    ...settings,
    providers,
    activeProviders,
    updateProviderSettings,
    debug,
    enableDebugMode,
    eventLogs,
    setEventLogs,
    promptId,
    setPromptId,
    isLatestBranch,
    enableLatestBranch,
    autoSelectTemplate,
    setAutoSelectTemplate,
    contextOptimizationEnabled,
    enableContextOptimization,
    setTheme,
    setLanguage,
    setNotifications,
    setTimezone,
    settings,
    tabConfiguration,
    updateTabConfiguration: updateTabConfig,
    resetTabConfiguration: resetTabConfig,
  };
}
