import { motion } from 'framer-motion';
import React, { Suspense, useState } from 'react';
import { classNames } from '~/utils/classNames';
import ConnectionDiagnostics from './ConnectionDiagnostics';
import { Button } from '~/components/ui/Button';
import VercelConnection from './VercelConnection';
import { useTranslation } from 'react-i18next';

// Use React.lazy for dynamic imports
const GitHubConnection = React.lazy(() => import('./GithubConnection'));
const NetlifyConnection = React.lazy(() => import('./NetlifyConnection'));

// Loading fallback component
const LoadingFallback = () => {
  const { t } = useTranslation('common');
  return (
    <div className="p-4 bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor">
      <div className="flex items-center justify-center gap-2 text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary">
        <div className="i-ph:spinner-gap w-4 h-4 animate-spin" />
        <span>{t('settings.connections.loadingConnection')}</span>
      </div>
    </div>
  );
};

export default function ConnectionsTab() {
  const { t } = useTranslation('common');
  const [isEnvVarsExpanded, setIsEnvVarsExpanded] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:plugs-connected w-5 h-5 text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent" />
          <h2 className="text-lg font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary">
            {t('settings.connections.title')}
          </h2>
        </div>
        <Button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          variant="outline"
          className="flex items-center gap-2 hover:bg-bolt-elements-item-backgroundActive/10 hover:text-bolt-elements-textPrimary dark:hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:text-bolt-elements-textPrimary transition-colors"
        >
          {showDiagnostics ? (
            <>
              <div className="i-ph:eye-slash w-4 h-4" />
              {t('settings.connections.hideDiagnostics')}
            </>
          ) : (
            <>
              <div className="i-ph:wrench w-4 h-4" />
              {t('settings.connections.troubleshootConnections')}
            </>
          )}
        </Button>
      </motion.div>
      <p className="text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary">
        {t('settings.connections.description')}
      </p>

      {/* Diagnostics Tool - Conditionally rendered */}
      {showDiagnostics && <ConnectionDiagnostics />}

      {/* Environment Variables Info - Collapsible */}
      <motion.div
        className="bg-bolt-elements-background dark:bg-bolt-elements-background rounded-lg border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-6">
          <button
            onClick={() => setIsEnvVarsExpanded(!isEnvVarsExpanded)}
            className={classNames(
              'w-full bg-transparent flex items-center justify-between',
              'hover:bg-bolt-elements-item-backgroundActive/10 hover:text-bolt-elements-textPrimary',
              'dark:hover:bg-bolt-elements-item-backgroundActive/10 dark:hover:text-bolt-elements-textPrimary',
              'rounded-md p-2 -m-2 transition-colors',
            )}
          >
            <div className="flex items-center gap-2">
              <div className="i-ph:info w-5 h-5 text-bolt-elements-item-contentAccent dark:text-bolt-elements-item-contentAccent" />
              <h3 className="text-base font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary">
                {t('settings.connections.environmentVariablesTitle')}
              </h3>
            </div>
            <div
              className={classNames(
                'i-ph:caret-down w-4 h-4 text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary transition-transform',
                isEnvVarsExpanded ? 'rotate-180' : '',
              )}
            />
          </button>

          {isEnvVarsExpanded && (
            <div className="mt-4">
              <p className="text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary mb-2">
                {t('settings.connections.envVarDescription', { file: '.env.local' })}
              </p>
              <div className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 p-3 rounded-md text-xs font-mono overflow-x-auto">
                <div className="text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary">
                  {t('settings.connections.envVarGithubAuthComment')}
                </div>
                <div className="text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary">
                  VITE_GITHUB_ACCESS_TOKEN=your_token_here
                </div>
                <div className="text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary">
                  {t('settings.connections.envVarTokenTypeComment')}
                </div>
                <div className="text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary">
                  VITE_GITHUB_TOKEN_TYPE={t('settings.connections.githubTokenTypeClassic')}|{t('settings.connections.githubTokenTypeFineGrained')}
                </div>
                <div className="text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary mt-2">
                  {t('settings.connections.envVarNetlifyAuthComment')}
                </div>
                <div className="text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary">
                  VITE_NETLIFY_ACCESS_TOKEN=your_token_here
                </div>
              </div>
              <div className="mt-3 text-xs text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary space-y-1">
                <p>
                  <span className="font-medium">{t('settings.connections.tokenTypesTitle')}</span>
                </p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  <li>
                    <span className="font-medium">{t('settings.connections.githubTokenTypeClassic')}</span> - {t('settings.connections.githubClassicDescription')}
                  </li>
                  <li>
                    <span className="font-medium">{t('settings.connections.githubTokenTypeFineGrained')}</span> - {t('settings.connections.githubFineGrainedDescription')}
                  </li>
                </ul>
                <p className="mt-2">
                  {t('settings.connections.envVarUsageNote')}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        <Suspense fallback={<LoadingFallback />}>
          <GitHubConnection />
        </Suspense>
        <Suspense fallback={<LoadingFallback />}>
          <NetlifyConnection />
        </Suspense>
        <Suspense fallback={<LoadingFallback />}>
          <VercelConnection />
        </Suspense>
      </div>

      {/* Additional help text */}
      <div className="text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2 p-4 rounded-lg">
        <p className="flex items-center gap-1 mb-2">
          <span className="i-ph:lightbulb w-4 h-4 text-bolt-elements-icon-success dark:text-bolt-elements-icon-success" />
          <span className="font-medium">{t('settings.connections.troubleshooting.title')}</span>
        </p>
        <p className="mb-2">
          {t('settings.connections.troubleshooting.intro')}
        </p>
        <p>{t('settings.connections.troubleshooting.persistentIssues')}</p>
        <ol className="list-decimal list-inside pl-4 mt-1">
          <li>{t('settings.connections.troubleshooting.checkConsole')}</li>
          <li>{t('settings.connections.troubleshooting.verifyPermissions')}</li>
          <li>{t('settings.connections.troubleshooting.clearCache')}</li>
          <li>{t('settings.connections.troubleshooting.checkCookies')}</li>
        </ol>
      </div>
    </div>
  );
}
