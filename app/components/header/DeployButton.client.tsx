import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import useViewport from '~/lib/hooks'; // Ensure this hook is available or remove if not used directly by deploy
import { chatStore } from '~/lib/stores/chat'; // Used for activePreview, isStreaming check potentially
import { netlifyConnection } from '~/lib/stores/netlify';
import { vercelConnection } from '~/lib/stores/vercel';
import { workbenchStore } from '~/lib/stores/workbench';
import { webcontainer } from '~/lib/webcontainer';
import { classNames } from '~/utils/classNames';
import { path } from '~/utils/path';
import { useEffect, useRef, useState } from 'react';
import type { ActionCallbackData } from '~/lib/runtime/message-parser';
import { chatId } from '~/lib/persistence/useChatHistory';
import { streamingState } from '~/lib/stores/streaming';
import { NetlifyDeploymentLink } from '~/components/chat/NetlifyDeploymentLink.client';
import { VercelDeploymentLink } from '~/components/chat/VercelDeploymentLink.client';
import { useTranslation } from 'react-i18next';

// This Button sub-component is copied from the original HeaderActionButtons.client.tsx
// as it's used by the deploy button and its dropdown items.
interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  children?: any;
  onClick?: VoidFunction;
  className?: string;
}

function Button({ active = false, disabled = false, children, onClick, className }: ButtonProps) {
  return (
    <button
      className={classNames(
        'flex items-center p-1.5', // Base classes, specific padding/text size will be on instance
        {
          'bg-bolt-elements-item-backgroundDefault hover:bg-bolt-elements-item-backgroundActive text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary':
            !active,
          'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent': active && !disabled,
          'bg-bolt-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed':
            disabled,
        },
        className,
      )}
      onClick={onClick}
      disabled={disabled} // Ensure disabled is passed to the HTML button
    >
      {children}
    </button>
  );
}

export function DeployButton() {
  const { t } = useTranslation('common');
  // Keep only state relevant to deploy button
  const netlifyConn = useStore(netlifyConnection);
  const vercelConn = useStore(vercelConnection);
  const [activePreviewIndex] = useState(0); // Assuming this logic for activePreview is still needed
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTo, setDeployingTo] = useState<'netlify' | 'vercel' | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isStreaming = useStore(streamingState); // From chatStore, used for disabling button

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentChatId = useStore(chatId);

  const handleNetlifyDeploy = async () => {
    if (!netlifyConn.user || !netlifyConn.token) {
      toast.error('Please connect to Netlify first in the settings tab!');
      return;
    }
    if (!currentChatId) {
      toast.error('No active chat found');
      return;
    }
    try {
      setIsDeploying(true);
      setDeployingTo('netlify');
      const artifact = workbenchStore.firstArtifact;
      if (!artifact) {
        throw new Error('No active project found');
      }
      const actionId = 'build-' + Date.now();
      const actionData: ActionCallbackData = {
        messageId: 'netlify build',
        artifactId: artifact.id,
        actionId,
        action: { type: 'build' as const, content: 'npm run build' },
      };
      artifact.runner.addAction(actionData);
      await artifact.runner.runAction(actionData);
      if (!artifact.runner.buildOutput) {
        throw new Error('Build failed');
      }
      const container = await webcontainer;
      const buildPath = artifact.runner.buildOutput.path.replace('/home/project', '');
      async function getAllFiles(dirPath: string): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const entries = await container.fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isFile()) {
            const content = await container.fs.readFile(fullPath, 'utf-8');
            const deployPath = fullPath.replace(buildPath, '');
            files[deployPath] = content;
          } else if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath);
            Object.assign(files, subFiles);
          }
        }
        return files;
      }
      const fileContents = await getAllFiles(buildPath);
      const existingSiteId = localStorage.getItem(`netlify-site-${currentChatId}`);
      const response = await fetch('/api/netlify-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: existingSiteId || undefined,
          files: fileContents,
          token: netlifyConn.token,
          chatId: currentChatId,
        }),
      });
      const data = (await response.json()) as any;
      if (!response.ok || !data.deploy || !data.site) {
        console.error('Invalid deploy response:', data);
        throw new Error(data.error || 'Invalid deployment response');
      }
      const maxAttempts = 20;
      let attempts = 0;
      let deploymentStatus;
      while (attempts < maxAttempts) {
        try {
          const statusResponse = await fetch(
            `https://api.netlify.com/api/v1/sites/${data.site.id}/deploys/${data.deploy.id}`,
            { headers: { Authorization: `Bearer ${netlifyConn.token}` } },
          );
          deploymentStatus = (await statusResponse.json()) as any;
          if (deploymentStatus.state === 'ready' || deploymentStatus.state === 'uploaded') break;
          if (deploymentStatus.state === 'error')
            throw new Error('Deployment failed: ' + (deploymentStatus.error_message || 'Unknown error'));
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Status check error:', error);
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      if (attempts >= maxAttempts) throw new Error('Deployment timed out');
      if (data.site) localStorage.setItem(`netlify-site-${currentChatId}`, data.site.id);
      toast.success(
        <div>
          Deployed successfully!{' '}
          <a
            href={deploymentStatus.ssl_url || deploymentStatus.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View site
          </a>
        </div>,
      );
    } catch (error) {
      console.error('Deploy error:', error);
      toast.error(error instanceof Error ? error.message : 'Deployment failed');
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  };

  const handleVercelDeploy = async () => {
    if (!vercelConn.user || !vercelConn.token) {
      toast.error('Please connect to Vercel first in the settings tab!');
      return;
    }
    if (!currentChatId) {
      toast.error('No active chat found');
      return;
    }
    try {
      setIsDeploying(true);
      setDeployingTo('vercel');
      const artifact = workbenchStore.firstArtifact;
      if (!artifact) {
        throw new Error('No active project found');
      }
      const actionId = 'build-' + Date.now();
      const actionData: ActionCallbackData = {
        messageId: 'vercel build',
        artifactId: artifact.id,
        actionId,
        action: { type: 'build' as const, content: 'npm run build' },
      };
      artifact.runner.addAction(actionData);
      await artifact.runner.runAction(actionData);
      if (!artifact.runner.buildOutput) {
        throw new Error('Build failed');
      }
      const container = await webcontainer;
      const buildPath = artifact.runner.buildOutput.path.replace('/home/project', '');
      async function getAllFiles(dirPath: string): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const entries = await container.fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isFile()) {
            const content = await container.fs.readFile(fullPath, 'utf-8');
            const deployPath = fullPath.replace(buildPath, '');
            files[deployPath] = content;
          } else if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath);
            Object.assign(files, subFiles);
          }
        }
        return files;
      }
      const fileContents = await getAllFiles(buildPath);
      const existingProjectId = localStorage.getItem(`vercel-project-${currentChatId}`);
      const response = await fetch('/api/vercel-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: existingProjectId || undefined,
          files: fileContents,
          token: vercelConn.token,
          chatId: currentChatId,
        }),
      });
      const data = (await response.json()) as any;
      if (!response.ok || !data.deploy || !data.project) {
        console.error('Invalid deploy response:', data);
        throw new Error(data.error || 'Invalid deployment response');
      }
      if (data.project) localStorage.setItem(`vercel-project-${currentChatId}`, data.project.id);
      toast.success(
        <div>
          Deployed successfully to Vercel!{' '}
          <a href={data.deploy.url} target="_blank" rel="noopener noreferrer" className="underline">
            View site
          </a>
        </div>,
      );
    } catch (error) {
      console.error('Vercel deploy error:', error);
      toast.error(error instanceof Error ? error.message : 'Vercel deployment failed');
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        disabled={isDeploying || !activePreview || isStreaming}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="px-3 py-1.5 text-sm rounded-lg hover:bg-bolt-elements-item-backgroundActive flex items-center gap-1 text-bolt-elements-textPrimary"
      >
        <div className="i-ph:cloud-arrow-up" />
        {isDeploying ? t('deploy.deploying') : t('deploy.title')}
        <div
          className={classNames('i-ph:caret-down w-3 h-3 transition-transform', isDropdownOpen ? 'rotate-180' : '')}
        />
      </Button>

      {isDropdownOpen && (
        // Changed from right-0 to left-0 for left alignment
        <div className="absolute left-0 flex flex-col gap-1 z-50 p-1 mt-1 min-w-[13.5rem] bg-bolt-elements-background-depth-2 rounded-md shadow-lg border border-bolt-elements-borderColor">
          <Button
            active // 'active' prop seems to be for styling, check if needed for dropdown items
            onClick={() => {
              handleNetlifyDeploy();
              setIsDropdownOpen(false);
            }}
            disabled={isDeploying || !activePreview || !netlifyConn.user || deployingTo === 'vercel'}
            className="flex items-center w-full px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive gap-2 rounded-md group relative"
          >
            {deployingTo === 'netlify' && isDeploying ? <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl animate-spin" /> : <img
              className="w-5 h-5"
              height="24"
              width="24"
              crossOrigin="anonymous"
              src="https://cdn.simpleicons.org/netlify"
              alt="Netlify"
            />}
            <span className="mx-auto">
              {!netlifyConn.user ? 'No Netlify Account Connected' : (deployingTo === 'netlify' && isDeploying ? 'Deploying...' : 'Deploy to Netlify')}
            </span>
            {netlifyConn.user && <NetlifyDeploymentLink />}
          </Button>
          <Button
            active
            onClick={() => {
              handleVercelDeploy();
              setIsDropdownOpen(false);
            }}
            disabled={isDeploying || !activePreview || !vercelConn.user || deployingTo === 'netlify'}
            className="flex items-center w-full px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive gap-2 rounded-md group relative"
          >
            {deployingTo === 'vercel' && isDeploying ? <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl animate-spin" /> : <img
              className="w-5 h-5 bg-black p-1 rounded" // Vercel icon style
              height="24"
              width="24"
              crossOrigin="anonymous"
              src="https://cdn.simpleicons.org/vercel/white"
              alt="Vercel"
            />}
            <span className="mx-auto">{!vercelConn.user ? 'No Vercel Account Connected' : (deployingTo === 'vercel' && isDeploying ? 'Deploying...' : 'Deploy to Vercel')}</span>
            {vercelConn.user && <VercelDeploymentLink />}
          </Button>
          <Button
            active={false}
            disabled // Coming soon button is always disabled
            className="flex items-center w-full rounded-md px-4 py-2 text-sm text-bolt-elements-textTertiary gap-2"
          >
            <span className="sr-only">Coming Soon</span>
            <img
              className="w-5 h-5"
              height="24"
              width="24"
              crossOrigin="anonymous"
              src="https://cdn.simpleicons.org/cloudflare"
              alt="Cloudflare"
            />
            <span className="mx-auto">{t('common.comingSoon')}</span>
          </Button>
        </div>
      )}
    </div>
  );
} 