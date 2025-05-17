import { memo, useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useStore } from '@nanostores/react';
import { IconButton } from '~/components/ui/IconButton';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { PortDropdown } from './PortDropdown';
import { ScreenshotSelector } from './ScreenshotSelector';
import { useTranslation } from 'react-i18next';
import type {IFrameReplaceMessageData} from './IFrameMessage'

type ResizeSide = 'left' | 'right' | null;

interface WindowSize {
  name: string;
  width: number;
  height: number;
  icon: string;
  hasFrame?: boolean;
  frameType?: 'mobile' | 'tablet' | 'laptop' | 'desktop';
}

const WINDOW_SIZES: WindowSize[] = [
  { name: 'iPhone SE', width: 375, height: 667, icon: 'i-ph:device-mobile', hasFrame: true, frameType: 'mobile' },
  { name: 'iPhone 12/13', width: 390, height: 844, icon: 'i-ph:device-mobile', hasFrame: true, frameType: 'mobile' },
  {
    name: 'iPhone 12/13 Pro Max',
    width: 428,
    height: 926,
    icon: 'i-ph:device-mobile',
    hasFrame: true,
    frameType: 'mobile',
  },
  { name: 'iPad Mini', width: 768, height: 1024, icon: 'i-ph:device-tablet', hasFrame: true, frameType: 'tablet' },
  { name: 'iPad Air', width: 820, height: 1180, icon: 'i-ph:device-tablet', hasFrame: true, frameType: 'tablet' },
  { name: 'iPad Pro 11"', width: 834, height: 1194, icon: 'i-ph:device-tablet', hasFrame: true, frameType: 'tablet' },
  {
    name: 'iPad Pro 12.9"',
    width: 1024,
    height: 1366,
    icon: 'i-ph:device-tablet',
    hasFrame: true,
    frameType: 'tablet',
  },
  { name: 'Small Laptop', width: 1280, height: 800, icon: 'i-ph:laptop', hasFrame: true, frameType: 'laptop' },
  { name: 'Laptop', width: 1366, height: 768, icon: 'i-ph:laptop', hasFrame: true, frameType: 'laptop' },
  { name: 'Large Laptop', width: 1440, height: 900, icon: 'i-ph:laptop', hasFrame: true, frameType: 'laptop' },
  { name: 'Desktop', width: 1920, height: 1080, icon: 'i-ph:monitor', hasFrame: true, frameType: 'desktop' },
  { name: '4K Display', width: 3840, height: 2160, icon: 'i-ph:monitor', hasFrame: true, frameType: 'desktop' },
];
interface PreviewDialogProps {
  onToggleEditMode?: (isEditMode: boolean) => void;
  editorSelectedFile: string | undefined;
  chatStarted?: boolean;
}
export const Preview = memo((props: PreviewDialogProps) => {
  const { t } = useTranslation('common');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);
  const hasSelectedPreview = useRef(false);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const selectedView = useStore(workbenchStore.currentView);

  const [url, setUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState<string | undefined>();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [previewLoadingState, setPreviewLoadingState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Toggle between responsive mode and device mode
  const [isDeviceModeOn, setIsDeviceModeOn] = useState(false);
  const [isEditModeOn, setIsEditModeOn] = useState(false);
  const isEditModeOnRef = useRef(isEditModeOn);
  // Use percentage for width
  const [widthPercent, setWidthPercent] = useState<number>(37.5);
  const [currentWidth, setCurrentWidth] = useState<number>(0);

  const resizingState = useRef({
    isResizing: false,
    side: null as ResizeSide,
    startX: 0,
    startWidthPercent: 37.5,
    windowWidth: window.innerWidth,
    pointerId: null as number | null,
  });

  // Reduce scaling factor to make resizing less sensitive
  const SCALING_FACTOR = 1;

  const [isWindowSizeDropdownOpen, setIsWindowSizeDropdownOpen] = useState(false);
  const [selectedWindowSize, setSelectedWindowSize] = useState<WindowSize>(WINDOW_SIZES[0]);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);
  const [showDeviceFrameInPreview, setShowDeviceFrameInPreview] = useState(false);

  // Effect for activePreview changes
  useEffect(() => {
    console.log('[Preview activePreviewEffect] Running. activePreview (raw):', activePreview, 'editorSelectedFile:', props.editorSelectedFile);
    try {
      console.log('[Preview activePreviewEffect] activePreview (stringified):', activePreview ? JSON.stringify(activePreview) : 'null/undefined');
    } catch (e) {
      console.warn('[Preview activePreviewEffect] Could not stringify activePreview:', e);
    }

    if (!activePreview) {
      setUrl('');
      setIframeUrl(undefined); 
      console.log('[Preview activePreviewEffect] No activePreview. Cleared iframeUrl.');
      return;
    }
    const { baseUrl } = activePreview;
    setUrl(baseUrl);
    let finalIframeUrl: string | undefined = undefined;
    if (props.editorSelectedFile && props.editorSelectedFile.toLowerCase().endsWith("html") && baseUrl) {
      const path = props.editorSelectedFile.replace("/home/project/public", "");
      finalIframeUrl = baseUrl + path;
    } else if (baseUrl) {
      finalIframeUrl = baseUrl;
    } else {
      finalIframeUrl = undefined;
    }
    console.log('[Preview activePreviewEffect] Setting iframeUrl to:', finalIframeUrl);
    setIframeUrl(finalIframeUrl);
  }, [activePreview, props.editorSelectedFile]);

  // Effect for iframeUrl changes (to set loading state)
  useEffect(() => {
    console.log('[Preview iframeUrlEffect] Running. iframeUrl:', iframeUrl, 'current loadingState:', previewLoadingState);
    if (iframeUrl) {
      console.log('[Preview iframeUrlEffect] iframeUrl changed, setting state to loading:', iframeUrl);
      setPreviewLoadingState('loading');
    } else {
      // If iframeUrl is cleared (e.g., no active preview)
      // and we are not in a persistent error state, then go to idle.
      if (previewLoadingState !== 'error') {
        console.log('[Preview] iframeUrl cleared, not in error state. Setting to idle.');
        setPreviewLoadingState('idle');
      }
      // If previewLoadingState IS 'error', we want to keep showing the error message.
    }
  }, [iframeUrl]); // Only depends on iframeUrl

  // Effect for props.editorSelectedFile changes (specific handling for HTML files)
  useEffect(() => {
    console.log('[Preview editorSelectedFileEffect] Running. editorSelectedFile:', props.editorSelectedFile, 'current base url (state):', url, 'current iframeUrl:', iframeUrl);
    if (props.editorSelectedFile && props.editorSelectedFile.toLowerCase().endsWith("html")) {
      if (url) { 
        const path = props.editorSelectedFile.replace("/home/project/public", "");
        const newIframeUrl = url + path;
        if (iframeUrl !== newIframeUrl) {
          console.log('[Preview] HTML file selected, updating iframeUrl to:', newIframeUrl);
          setIframeUrl(newIframeUrl); // This will trigger loading sequence via the [iframeUrl] useEffect
        }
      }
      // If no `url` (no activePreview), do nothing here; activePreview effect will handle clearing.
    } else if (props.editorSelectedFile) {
      // A non-HTML file is selected. For now, we don't clear the preview, 
      // allowing the last valid HTML preview (or its error state) to persist.
      // If a different behavior is desired, iframeUrl could be set to undefined here.
      console.log('[Preview] Non-HTML file selected:', props.editorSelectedFile);
    }
  }, [props.editorSelectedFile, url, iframeUrl]); // url and iframeUrl are needed for comparison and construction


  // Effect for attaching iframe event listeners
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe && previewLoadingState === 'loading' && iframeUrl) {
      console.log('[Preview] Attaching load/error listeners to iframe for src:', iframeUrl);
      let hasHandledEvent = false;

      const normalizeUrl = (url: string | undefined | null): string => {
        if (!url) return '';
        return url.endsWith('/') ? url.slice(0, -1) : url;
      };

      const handleLoad = () => {
        if (hasHandledEvent) return;
        
        const currentSrcNormalized = normalizeUrl(iframeRef.current?.src);
        const expectedSrcNormalized = normalizeUrl(iframeUrl);

        if (iframeRef.current && currentSrcNormalized === expectedSrcNormalized) {
          console.log('[Preview] iframe loaded successfully (after normalization): current normalized:', currentSrcNormalized, 'expected normalized:', expectedSrcNormalized);
          setPreviewLoadingState('success');
          hasHandledEvent = true;
        } else {
          console.warn('[Preview] iframe loaded, but src mismatch or unexpected load. Normalized Current:',
            currentSrcNormalized, 'Normalized Expected:', expectedSrcNormalized, 
            'Raw Current:', iframeRef.current?.src, 'Raw Expected:', iframeUrl);
          // Do not set to success if it's not the URL we expect, as it might be an error page or redirect.
          // If it's a legitimate redirect that should be considered success, this logic needs refinement.
        }
      };

      const handleError = () => {
        if (hasHandledEvent) return;
        // Ensure error is for the src we tried to load.
        console.error('[Preview] iframe failed to load:', iframeUrl);
        setPreviewLoadingState('error');
        hasHandledEvent = true;
      };

      iframe.addEventListener('load', handleLoad);
      iframe.addEventListener('error', handleError);

      // If the iframe's current src is different from the intended iframeUrl, update it.
      // This ensures that if iframeUrl changed, the src is definitely set.
      if (iframe.src !== iframeUrl) {
        console.log('[Preview] iframe src (', iframe.src, ') differs from iframeUrl (', iframeUrl, '). Setting src.');
        iframe.src = iframeUrl;
      } else {
        // If src is already set, some browsers might not re-trigger load/error if content is cached or unchanged.
        // A forced reload might be needed if we suspect this. For now, assume events will fire.
      }

      return () => {
        console.log('[Preview] Cleaning up iframe listeners for:', iframeUrl);
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
      };
    }
  }, [previewLoadingState, iframeUrl]); // Depends on loading state and the URL itself

  const reloadPreview = useCallback(() => {
    if (iframeRef.current && iframeUrl) {
      console.log('[Preview] Reloading preview for:', iframeUrl);
      setPreviewLoadingState('loading'); 
      const currentIframeSrc = iframeRef.current.src;
      iframeRef.current.src = ''; 
      setTimeout(() => {
          if (iframeRef.current) iframeRef.current.src = iframeUrl; 
      }, 0);
    } else {
      console.log('[Preview] Reload requested, but no iframeUrl or iframeRef.');
    }
  }, [iframeUrl]);

  const validateUrl = useCallback((value: string) => {
    // Basic URL validation, replace with your actual validation
    return value.startsWith('http://') || value.startsWith('https://');
  }, []);

  const findMinPortIndex = useCallback(
    (minIndex: number, preview: { port: number }, index: number, array: { port: number }[]) => {
      return preview.port < array[minIndex].port ? index : minIndex;
    },
    [],
  );

  useEffect(() => {
    if (previews.length > 1 && !hasSelectedPreview.current) {
      const minPortIndex = previews.reduce(findMinPortIndex, 0);
      setActivePreviewIndex(minPortIndex);
    }
  }, [previews, findMinPortIndex]);

  const toggleFullscreen = async () => {
    if (!isFullscreen && containerRef.current) {
      await containerRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleDeviceMode = () => {
    setIsDeviceModeOn((prev) => !prev);
  };

  useEffect(() => {
    if (props.onToggleEditMode) {
      props.onToggleEditMode(isEditModeOn);
    }
    if (iframeRef.current) {
      iframeRef.current.contentWindow!.postMessage({ msgType: 'switchMode', dstModeType:isEditModeOn ? 2:0 }, '*');
    }
    isEditModeOnRef.current = isEditModeOn;
  }, [isEditModeOn]);

  useEffect(() => {
    window.addEventListener('message', handleIFrameMessage);
    return () => {
      window.removeEventListener('message', handleIFrameMessage);
    };
  }, []);


  const handleIFrameMessage = (event:any) => {
    const data = event.data as IFrameReplaceMessageData
    const msgType = data.msgType
    if (msgType === "requestEditMode") {
      if (iframeRef.current) {
        iframeRef.current.contentWindow!.postMessage({ msgType: 'switchMode', dstModeType:isEditModeOnRef.current ? 2:0}, '*');
      }
    } else if (msgType === "save") {
      setIsEditModeOn(false);
    }
  }

  const toggleEditMode = () => {
    setIsEditModeOn((prev) => !prev);
  };

  const startResizing = (e: React.PointerEvent, side: ResizeSide) => {
    if (!isDeviceModeOn) {
      return;
    }

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    resizingState.current = {
      isResizing: true,
      side,
      startX: e.clientX,
      startWidthPercent: widthPercent,
      windowWidth: window.innerWidth,
      pointerId: e.pointerId,
    };
  };

  const ResizeHandle = ({ side }: { side: ResizeSide }) => {
    if (!side) {
      return null;
    }

    return (
      <div
        className={`resize-handle-${side}`}
        onPointerDown={(e) => startResizing(e, side)}
        style={{
          position: 'absolute',
          top: 0,
          ...(side === 'left' ? { left: 0, marginLeft: '-7px' } : { right: 0, marginRight: '-7px' }),
          width: '15px',
          height: '100%',
          cursor: 'ew-resize',
          background: 'var(--bolt-elements-background-depth-4, rgba(0,0,0,.3))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
          userSelect: 'none',
          touchAction: 'none',
          zIndex: 10,
        }}
        onMouseOver={(e) =>
          (e.currentTarget.style.background = 'var(--bolt-elements-background-depth-4, rgba(0,0,0,.3))')
        }
        onMouseOut={(e) =>
          (e.currentTarget.style.background = 'var(--bolt-elements-background-depth-3, rgba(0,0,0,.15))')
        }
        title="Drag to resize width"
      >
        <GripIcon />
      </div>
    );
  };

  useEffect(() => {
    // Skip if not in device mode
    if (!isDeviceModeOn) {
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      const state = resizingState.current;

      if (!state.isResizing || e.pointerId !== state.pointerId) {
        return;
      }

      const dx = e.clientX - state.startX;
      const dxPercent = (dx / state.windowWidth) * 100 * SCALING_FACTOR;

      let newWidthPercent = state.startWidthPercent;

      if (state.side === 'right') {
        newWidthPercent = state.startWidthPercent + dxPercent;
      } else if (state.side === 'left') {
        newWidthPercent = state.startWidthPercent - dxPercent;
      }

      // Limit width percentage between 10% and 90%
      newWidthPercent = Math.max(10, Math.min(newWidthPercent, 90));

      // Force a synchronous update to ensure the UI reflects the change immediately
      setWidthPercent(newWidthPercent);

      // Calculate and update the actual pixel width
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const newWidth = Math.round((containerWidth * newWidthPercent) / 100);
        setCurrentWidth(newWidth);

        // Apply the width directly to the container for immediate feedback
        const previewContainer = containerRef.current.querySelector('div[style*="width"]');

        if (previewContainer) {
          (previewContainer as HTMLElement).style.width = `${newWidthPercent}%`;
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const state = resizingState.current;

      if (!state.isResizing || e.pointerId !== state.pointerId) {
        return;
      }

      // Find all resize handles
      const handles = document.querySelectorAll('.resize-handle-left, .resize-handle-right');

      // Release pointer capture from any handle that has it
      handles.forEach((handle) => {
        if ((handle as HTMLElement).hasPointerCapture?.(e.pointerId)) {
          (handle as HTMLElement).releasePointerCapture(e.pointerId);
        }
      });

      // Reset state
      resizingState.current = {
        ...resizingState.current,
        isResizing: false,
        side: null,
        pointerId: null,
      };

      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    // Add event listeners
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);

    // Define cleanup function
    function cleanupResizeListeners() {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);

      // Release any lingering pointer captures
      if (resizingState.current.pointerId !== null) {
        const handles = document.querySelectorAll('.resize-handle-left, .resize-handle-right');
        handles.forEach((handle) => {
          if ((handle as HTMLElement).hasPointerCapture?.(resizingState.current.pointerId!)) {
            (handle as HTMLElement).releasePointerCapture(resizingState.current.pointerId!);
          }
        });

        // Reset state
        resizingState.current = {
          ...resizingState.current,
          isResizing: false,
          side: null,
          pointerId: null,
        };

        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    }

    // Return the cleanup function
    // eslint-disable-next-line consistent-return
    return cleanupResizeListeners;
  }, [isDeviceModeOn, SCALING_FACTOR]);

  useEffect(() => {
    const handleWindowResize = () => {
      // Update the window width in the resizing state
      resizingState.current.windowWidth = window.innerWidth;

      // Update the current width in pixels
      if (containerRef.current && isDeviceModeOn) {
        const containerWidth = containerRef.current.clientWidth;
        setCurrentWidth(Math.round((containerWidth * widthPercent) / 100));
      }
    };

    window.addEventListener('resize', handleWindowResize);

    // Initial calculation of current width
    if (containerRef.current && isDeviceModeOn) {
      const containerWidth = containerRef.current.clientWidth;
      setCurrentWidth(Math.round((containerWidth * widthPercent) / 100));
    }

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [isDeviceModeOn, widthPercent]);

  // Update current width when device mode is toggled
  useEffect(() => {
    if (containerRef.current && isDeviceModeOn) {
      const containerWidth = containerRef.current.clientWidth;
      setCurrentWidth(Math.round((containerWidth * widthPercent) / 100));
    }
  }, [isDeviceModeOn]);

  const GripIcon = () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          color: 'var(--bolt-elements-textSecondary, rgba(0,0,0,0.5))',
          fontSize: '10px',
          lineHeight: '5px',
          userSelect: 'none',
          marginLeft: '1px',
        }}
      >
        ••• •••
      </div>
    </div>
  );

  const openInNewWindow = (size: WindowSize) => {
    if (activePreview?.baseUrl) {
      const match = activePreview.baseUrl.match(/^https?:\/\/([^.]+)\.local-credentialless\.webcontainer-api\.io/);

      if (match) {
        const previewId = match[1];
        const previewUrl = `/webcontainer/preview/${previewId}`;

        // Adjust dimensions for landscape mode if applicable
        let width = size.width;
        let height = size.height;

        if (isLandscape && (size.frameType === 'mobile' || size.frameType === 'tablet')) {
          // Swap width and height for landscape mode
          width = size.height;
          height = size.width;
        }

        // Create a window with device frame if enabled
        if (showDeviceFrame && size.hasFrame) {
          // Calculate frame dimensions
          const frameWidth = size.frameType === 'mobile' ? (isLandscape ? 120 : 40) : 60; // Width padding on each side
          const frameHeight = size.frameType === 'mobile' ? (isLandscape ? 80 : 80) : isLandscape ? 60 : 100; // Height padding on top and bottom

          // Create a window with the correct dimensions first
          const newWindow = window.open(
            '',
            '_blank',
            `width=${width + frameWidth},height=${height + frameHeight + 40},menubar=no,toolbar=no,location=no,status=no`,
          );

          if (!newWindow) {
            console.error('Failed to open new window');
            return;
          }

          // Create the HTML content for the frame
          const frameColor = getFrameColor();
          const frameRadius = size.frameType === 'mobile' ? '36px' : '20px';
          const framePadding =
            size.frameType === 'mobile'
              ? isLandscape
                ? '40px 60px'
                : '40px 20px'
              : isLandscape
                ? '30px 50px'
                : '50px 30px';

          // Position notch and home button based on orientation
          const notchTop = isLandscape ? '50%' : '20px';
          const notchLeft = isLandscape ? '30px' : '50%';
          const notchTransform = isLandscape ? 'translateY(-50%)' : 'translateX(-50%)';
          const notchWidth = isLandscape ? '8px' : size.frameType === 'mobile' ? '60px' : '80px';
          const notchHeight = isLandscape ? (size.frameType === 'mobile' ? '60px' : '80px') : '8px';

          const homeBottom = isLandscape ? '50%' : '15px';
          const homeRight = isLandscape ? '30px' : '50%';
          const homeTransform = isLandscape ? 'translateY(50%)' : 'translateX(50%)';
          const homeWidth = isLandscape ? '4px' : '40px';
          const homeHeight = isLandscape ? '40px' : '4px';

          // Create HTML content for the wrapper page
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>${size.name} Preview</title>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background: #f0f0f0;
                  overflow: hidden;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }

                .device-container {
                  position: relative;
                }

                .device-name {
                  position: absolute;
                  top: -30px;
                  left: 0;
                  right: 0;
                  text-align: center;
                  font-size: 14px;
                  color: #333;
                }

                .device-frame {
                  position: relative;
                  border-radius: ${frameRadius};
                  background: ${frameColor};
                  padding: ${framePadding};
                  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                  overflow: hidden;
                }

                /* Notch */
                .device-frame:before {
                  content: '';
                  position: absolute;
                  top: ${notchTop};
                  left: ${notchLeft};
                  transform: ${notchTransform};
                  width: ${notchWidth};
                  height: ${notchHeight};
                  background: #333;
                  border-radius: 4px;
                  z-index: 2;
                }

                /* Home button */
                .device-frame:after {
                  content: '';
                  position: absolute;
                  bottom: ${homeBottom};
                  right: ${homeRight};
                  transform: ${homeTransform};
                  width: ${homeWidth};
                  height: ${homeHeight};
                  background: #333;
                  border-radius: 50%;
                  z-index: 2;
                }

                iframe {
                  border: none;
                  width: ${width}px;
                  height: ${height}px;
                  background: white;
                  display: block;
                }
              </style>
            </head>
            <body>
              <div class="device-container">
                <div class="device-name">${size.name} ${isLandscape ? '(Landscape)' : '(Portrait)'}</div>
                <div class="device-frame">
                  <iframe src="${previewUrl}" sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin" allow="cross-origin-isolated"></iframe>
                </div>
              </div>
            </body>
            </html>
          `;

          // Write the HTML content to the new window
          newWindow.document.open();
          newWindow.document.write(htmlContent);
          newWindow.document.close();
        } else {
          // Standard window without frame
          const newWindow = window.open(
            previewUrl,
            '_blank',
            `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`,
          );

          if (newWindow) {
            newWindow.focus();
          }
        }
      } else {
        console.warn('[Preview] Invalid WebContainer URL:', activePreview.baseUrl);
      }
    }
  };

  // Function to get the correct frame padding based on orientation
  const getFramePadding = useCallback(() => {
    if (!selectedWindowSize) {
      return '40px 20px';
    }

    const isMobile = selectedWindowSize.frameType === 'mobile';

    if (isLandscape) {
      // Increase horizontal padding in landscape mode to ensure full device frame is visible
      return isMobile ? '40px 60px' : '30px 50px';
    }

    return isMobile ? '40px 20px' : '50px 30px';
  }, [isLandscape, selectedWindowSize]);

  // Function to get the scale factor for the device frame
  const getDeviceScale = useCallback(() => {
    // Always return 1 to ensure the device frame is shown at its exact size
    return 1;
  }, [isLandscape, selectedWindowSize, widthPercent]);

  // Update the device scale when needed
  useEffect(() => {
    /*
     * Intentionally disabled - we want to maintain scale of 1
     * No dynamic scaling to ensure device frame matches external window exactly
     */
    return () => {};
  }, [isDeviceModeOn, showDeviceFrameInPreview, getDeviceScale, isLandscape, selectedWindowSize]);

  // Function to get the frame color based on dark mode
  const getFrameColor = useCallback(() => {
    // Check if the document has a dark class or data-theme="dark"
    const isDarkMode =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Return a darker color for light mode, lighter color for dark mode
    return isDarkMode ? '#555' : '#111';
  }, []);

  // Effect to handle color scheme changes
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleColorSchemeChange = () => {
      // Force a re-render when color scheme changes
      if (showDeviceFrameInPreview) {
        setShowDeviceFrameInPreview(true);
      }
    };

    darkModeMediaQuery.addEventListener('change', handleColorSchemeChange);

    return () => {
      darkModeMediaQuery.removeEventListener('change', handleColorSchemeChange);
    };
  }, [showDeviceFrameInPreview]);

  // ---- New Rendering Logic for Initializing Message ----
  const showInitializingMessage = props.chatStarted && previews.length === 0 && selectedView === 'preview';

  if (showInitializingMessage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-bolt-elements-textTertiary p-4 bg-bolt-elements-background-depth-1">
        <div className="i-ph:hourglass-medium text-4xl mb-3 animate-spin" />
        <p className="text-sm font-medium">项目正在初始化中...</p>
        <p className="text-xs mt-1 text-center">请稍候，正在准备预览环境。</p>
      </div>
    );
  }

  // Existing logic for "No preview available"
  if (previewLoadingState === 'idle' && !iframeUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-bolt-elements-textTertiary p-4 bg-bolt-elements-background-depth-1">
        <div className="i-ph:selection-slash text-4xl mb-3" />
        <p className="text-sm font-medium">{t('preview.noPreview')}</p>
        <p className="text-xs mt-1 text-center">{t('preview.noPreviewHint')}</p>
      </div>
    );
  }

  // Fallback to the main preview rendering if none of the above conditions are met.
  // This includes 'loading', 'success', 'error' states for the iframe, or if iframeUrl is present but state is 'idle' (should be rare).
  return (
    <div className="relative h-full w-full flex flex-col bg-bolt-elements-background-depth-1 overflow-hidden">
      {/* Header for URL, refresh, etc. - This structure is assumed from typical layout */}
      <div className="flex items-center p-2 border-b border-bolt-elements-borderColor gap-2 flex-shrink-0">
        <PortDropdown 
          previews={previews} 
          activePreviewIndex={activePreviewIndex} 
          setActivePreviewIndex={setActivePreviewIndex}
          isDropdownOpen={isPortDropdownOpen}
          setIsDropdownOpen={setIsPortDropdownOpen}
          setHasSelectedPreview={() => {}}
        />
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (validateUrl(url)) {
                setIframeUrl(url);
              }
            }
          }}
          className="flex-1 px-2 py-1 text-xs rounded bg-bolt-elements-background-depth-2 border border-transparent focus:border-accent-500 focus:ring-accent-500/50 outline-none"
          placeholder={t('preview.addressBarPlaceholder') ?? "Enter URL..."}
        />
        <IconButton
          title={t('preview.refresh') ?? "Refresh"}
          onClick={reloadPreview}
          className="text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundHover"
          disabled={!iframeUrl || previewLoadingState === 'loading'}
        >
          <div className="i-ph:arrow-clockwise" />
        </IconButton>
        <IconButton
          title={t('preview.openInNewTab') ?? "Open in new tab"}
          onClick={() => iframeUrl && window.open(iframeUrl, '_blank')}
          className="text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundHover"
          disabled={!iframeUrl}
        >
          <div className="i-ph:arrow-square-out" />
        </IconButton>
      </div>

      {/* Content Area for iframe or messages */}
      <div ref={containerRef} className="relative flex-1 w-full h-full overflow-auto flex items-center justify-center">
        {/* Loading message for iframe */}
        {previewLoadingState === 'loading' && iframeUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bolt-elements-background-depth-1/50 backdrop-blur-sm z-10">
            <div className="i-ph:circle-notch text-3xl animate-spin text-bolt-elements-textTertiary mb-2" />
            <p className="text-xs text-bolt-elements-textTertiary">正在加载页面内容...</p>
          </div>
        )}
        {/* Error message for iframe */}
        {previewLoadingState === 'error' && iframeUrl && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/20 z-10 p-4 text-center">
             <div className="i-ph:x-circle text-4xl text-red-400 mb-3" />
             <p className="text-sm font-medium text-red-300">无法加载预览内容。</p>
             <p className="text-xs text-red-400/80 mt-1 mb-3">请检查URL地址或网络连接，然后重试。</p>
             <button 
                onClick={reloadPreview}
                className="px-3 py-1.5 text-xs bg-red-500/30 hover:bg-red-500/40 text-red-200 rounded-md border border-red-500/50 transition-colors"
             >
                <div className="flex items-center gap-1.5">
                    <div className="i-ph:arrow-clockwise"/>
                    <span>重试</span>
                </div>
             </button>
           </div>
        )}
        
        {/* Iframe itself - ensure it's only mounted when there's an iframeUrl to avoid loading 'about:blank' if logic permits */}
        {iframeUrl && (
            <iframe 
                ref={iframeRef} 
                title="Preview" 
                className="w-full h-full border-0 bg-white" 
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation"
                // src is set via useEffect to better control loading sequence
            />
        )}
      </div>
    </div>
  );
});
