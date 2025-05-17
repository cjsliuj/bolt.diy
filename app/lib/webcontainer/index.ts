import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

// Declare webcontainer here to be assigned later. Use 'any' initially or a more specific type if feasible
// without importing WebContainer type at the top level.
export let webcontainer: Promise<any>; // Changed from Promise<WebContainer>

if (!import.meta.env.SSR) {
  const clientLogPrefix = `[${new Date().toISOString()}] ClientWebContainer:`;
  // console.log(`${clientLogPrefix} Initializing for client.`); // Removed

  // Attempt to restore from HMR or boot a new one
  const bootProcess =
    import.meta.hot?.data.webcontainer ??
    // Dynamically import @webcontainer/api only on the client side
    import('@webcontainer/api')
      .then(({ WebContainer }) => { // Destructure WebContainer class from the imported module
        // console.log(`${clientLogPrefix} @webcontainer/api loaded. Booting WebContainer...`); // Removed
        return WebContainer.boot({
          coep: 'credentialless',
          workdirName: WORK_DIR_NAME,
          forwardPreviewErrors: true, // Enable error forwarding from iframes
        });
      })
      .then(async (wcInstance) => { // wcInstance should be of type WebContainer here
        // console.log(`${clientLogPrefix} WebContainer booted successfully.`); // Removed
        webcontainerContext.loaded = true;

        const { workbenchStore } = await import('~/lib/stores/workbench');

        // Listen for preview errors
        // Make sure wcInstance is correctly typed or cast if necessary for .on()
        (wcInstance as any).on('preview-message', (message: any) => {
          // console.log('[WebContainer] preview message:', message); // Removed, this one is noisy
          if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
            const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
            workbenchStore.actionAlert.set({
              type: 'preview',
              title: isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception',
              description: message.message,
              content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
              source: 'preview',
            });
          }
        });

        return wcInstance;
      })
      .catch(err => {
        console.error(`${clientLogPrefix} WebContainer dynamic import or boot failed:`, err);
        throw err; // Re-throw to ensure promise rejects
      });

  webcontainer = bootProcess;

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
} else {
  // For SSR, provide a promise that never resolves, as WebContainer is client-only
  // console.log(`[${new Date().toISOString()}] SSRWebContainer: Providing non-resolving promise for SSR.`); // Removed
  webcontainer = new Promise(() => {});
}
