import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect, useState, useMemo,  useRef } from 'react';
import { toast } from 'react-toastify';
import { Popover, Transition } from '@headlessui/react';
import { diffLines, type Change } from 'diff';
import { ActionRunner } from '~/lib/runtime/action-runner';
import { getLanguageFromExtension } from '~/utils/getLanguageFromExtension';
import type { FileHistory } from '~/types/actions';
import { DiffView } from './DiffView';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import useViewport from '~/lib/hooks';
import { PushToGitHubDialog } from '~/components/@settings/tabs/connections/components/PushToGitHubDialog';
import type { IFrameReplaceMessageData } from './IFrameMessage';
import { DeployButton } from '~/components/header/DeployButton.client';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
  actionRunner: ActionRunner;
  metadata?: {
    gitUrl?: string;
  };
  updateChatMestaData?: (metadata: any) => void;
}

const viewTransition = { ease: cubicEasingFn };

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: {
    value: 'code',
    text: '文件',
  },
  // middle: {
  //   value: 'diff',
  //   text: 'Diff',
  // },
  right: {
    value: 'preview',
    text: '预览',
  },
};

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

const FileModifiedDropdown = memo(
  ({
    fileHistory,
    onSelectFile,
  }: {
    fileHistory: Record<string, FileHistory>;
    onSelectFile: (filePath: string) => void;
  }) => {
    const modifiedFiles = Object.entries(fileHistory);
    const hasChanges = modifiedFiles.length > 0;
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFiles = useMemo(() => {
      return modifiedFiles.filter(([filePath]) => filePath.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [modifiedFiles, searchQuery]);

    return (
      <div className="flex items-center gap-2">
        <Popover className="relative">
          {({ open }: { open: boolean }) => (
            <>
              <Popover.Button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors text-bolt-elements-textPrimary border border-bolt-elements-borderColor">
                <span className="font-medium">File Changes</span>
                {hasChanges && (
                  <span className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-500 text-xs flex items-center justify-center border border-accent-500/30">
                    {modifiedFiles.length}
                  </span>
                )}
              </Popover.Button>
              <Transition
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Popover.Panel className="absolute right-0 z-20 mt-2 w-80 origin-top-right rounded-xl bg-bolt-elements-background-depth-2 shadow-xl border border-bolt-elements-borderColor">
                  <div className="p-2">
                    <div className="relative mx-2 mb-2">
                      <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary">
                        <div className="i-ph:magnifying-glass" />
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      {filteredFiles.length > 0 ? (
                        filteredFiles.map(([filePath, history]) => {
                          const extension = filePath.split('.').pop() || '';
                          const language = getLanguageFromExtension(extension);

                          return (
                            <button
                              key={filePath}
                              onClick={() => onSelectFile(filePath)}
                              className="w-full px-3 py-2 text-left rounded-md hover:bg-bolt-elements-background-depth-1 transition-colors group bg-transparent"
                            >
                              <div className="flex items-center gap-2">
                                <div className="shrink-0 w-5 h-5 text-bolt-elements-textTertiary">
                                  {['typescript', 'javascript', 'jsx', 'tsx'].includes(language) && (
                                    <div className="i-ph:file-js" />
                                  )}
                                  {['css', 'scss', 'less'].includes(language) && <div className="i-ph:paint-brush" />}
                                  {language === 'html' && <div className="i-ph:code" />}
                                  {language === 'json' && <div className="i-ph:brackets-curly" />}
                                  {language === 'python' && <div className="i-ph:file-text" />}
                                  {language === 'markdown' && <div className="i-ph:article" />}
                                  {['yaml', 'yml'].includes(language) && <div className="i-ph:file-text" />}
                                  {language === 'sql' && <div className="i-ph:database" />}
                                  {language === 'dockerfile' && <div className="i-ph:cube" />}
                                  {language === 'shell' && <div className="i-ph:terminal" />}
                                  {![
                                    'typescript',
                                    'javascript',
                                    'css',
                                    'html',
                                    'json',
                                    'python',
                                    'markdown',
                                    'yaml',
                                    'yml',
                                    'sql',
                                    'dockerfile',
                                    'shell',
                                    'jsx',
                                    'tsx',
                                    'scss',
                                    'less',
                                  ].includes(language) && <div className="i-ph:file-text" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex flex-col min-w-0">
                                      <span className="truncate text-sm font-medium text-bolt-elements-textPrimary">
                                        {filePath.split('/').pop()}
                                      </span>
                                      <span className="truncate text-xs text-bolt-elements-textTertiary">
                                        {filePath}
                                      </span>
                                    </div>
                                    {(() => {
                                      // Calculate diff stats
                                      const { additions, deletions } = (() => {
                                        if (!history.originalContent) {
                                          return { additions: 0, deletions: 0 };
                                        }

                                        const normalizedOriginal = history.originalContent.replace(/\r\n/g, '\n');
                                        const normalizedCurrent =
                                          history.versions[history.versions.length - 1]?.content.replace(
                                            /\r\n/g,
                                            '\n',
                                          ) || '';

                                        if (normalizedOriginal === normalizedCurrent) {
                                          return { additions: 0, deletions: 0 };
                                        }

                                        const changes = diffLines(normalizedOriginal, normalizedCurrent, {
                                          newlineIsToken: false,
                                          ignoreWhitespace: true,
                                          ignoreCase: false,
                                        });

                                        return changes.reduce(
                                          (acc: { additions: number; deletions: number }, change: Change) => {
                                            if (change.added) {
                                              acc.additions += change.value.split('\n').length;
                                            }

                                            if (change.removed) {
                                              acc.deletions += change.value.split('\n').length;
                                            }

                                            return acc;
                                          },
                                          { additions: 0, deletions: 0 },
                                        );
                                      })();

                                      const showStats = additions > 0 || deletions > 0;

                                      return (
                                        showStats && (
                                          <div className="flex items-center gap-1 text-xs shrink-0">
                                            {additions > 0 && <span className="text-green-500">+{additions}</span>}
                                            {deletions > 0 && <span className="text-red-500">-{deletions}</span>}
                                          </div>
                                        )
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-12 h-12 mb-2 text-bolt-elements-textTertiary">
                            <div className="i-ph:file-dashed" />
                          </div>
                          <p className="text-sm font-medium text-bolt-elements-textPrimary">
                            {searchQuery ? 'No matching files' : 'No modified files'}
                          </p>
                          <p className="text-xs text-bolt-elements-textTertiary mt-1">
                            {searchQuery ? 'Try another search' : 'Changes will appear here as you edit'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {hasChanges && (
                    <div className="border-t border-bolt-elements-borderColor p-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(filteredFiles.map(([filePath]) => filePath).join('\n'));
                          toast('File list copied to clipboard', {
                            icon: <div className="i-ph:check-circle text-accent-500" />,
                          });
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-3 transition-colors text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary"
                      >
                        Copy File List
                      </button>
                    </div>
                  )}
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    );
  },
);

export const Workbench =
  // eslint-disable-next-line react/display-name
  memo(
    ({ chatStarted: propsChatStarted, isStreaming, actionRunner, metadata, updateChatMestaData }: WorkspaceProps) => {
      renderLogger.trace('Workbench');
      const files = useStore(workbenchStore.files);
      const selectedFileFromStore = useStore(workbenchStore.selectedFile); // Renamed for clarity
      const currentViewFromStore = useStore(workbenchStore.currentView);

      const initialFileOpened = useRef(false); // For index.html logic
      const initialPreviewSet = useRef(false); // For existing preview logic
      const automaticViewCorrectionDone = useRef(false); // For existing preview logic
      const [isSyncing, setIsSyncing] = useState(false);
      const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
      const [fileHistory, setFileHistory] = useState<Record<string, FileHistory>>({});
      const [editorSelectedFile, setEditorSelectedFile] = useState<string|undefined>("");
      const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
      const showWorkbench = useStore(workbenchStore.showWorkbench);
      const { showChat } = useStore(chatStore);
      const currentDocument = useStore(workbenchStore.currentDocument);
      const unsavedFiles = useStore(workbenchStore.unsavedFiles);
      const filesMap = useStore(workbenchStore.files);
      const currentWorkbenchView = useStore(workbenchStore.currentView);

      console.log('[Workbench] Rendering with selectedView from store:', currentViewFromStore);

      const isSmallViewport = useViewport(1024);

      const setSelectedView = (view: WorkbenchViewType) => {
        console.log(`[Workbench] setSelectedView called with: ${view}. Current store value before set: ${workbenchStore.currentView.get()}`);
        workbenchStore.currentView.set(view);
        console.log(`[Workbench] Store value after set: ${workbenchStore.currentView.get()}`);
      };

      useEffect(() => {
        workbenchStore.toggleTerminal(false);

        window.addEventListener('message', handleIFrameMessage);
        return () => {
          window.removeEventListener('message', handleIFrameMessage);
        };

      }, []);

      useEffect(() => {
        const currentViewActual = workbenchStore.currentView.get();
        const previews = workbenchStore.previews.get();
        const hasReadyPreview = previews && previews.length > 0 && previews.some(p => p.port !== undefined && p.ready);
        const localFiles = workbenchStore.files.get(); // Get current files state

        // console.log(
        //   '[Workbench InitialSwitchEffectRevised v4.1] Running.', {
        //     propsChatStarted,
        //     initialPreviewSet: initialPreviewSet.current,
        //     automaticViewCorrectionDone: automaticViewCorrectionDone.current,
        //     currentViewActual,
        //     hasReadyPreview,
        //     filesLoaded: localFiles && Object.keys(localFiles).length > 0,
        //   }
        // );

        if (propsChatStarted && !initialPreviewSet.current) {
          // Phase 1: Initial switch to preview
          if (currentViewActual !== 'preview') {
            // console.log('[Workbench InitialSwitchEffectRevised v4.1] Phase 1: Setting view to preview');
            workbenchStore.currentView.set('preview');
          }
          initialPreviewSet.current = true;
          // console.log('[Workbench InitialSwitchEffectRevised v4.1] Phase 1: initialPreviewSet set to true');
        } else if (propsChatStarted && initialPreviewSet.current && !automaticViewCorrectionDone.current) {
          // Phase 2: Try to keep view on 'preview' until files are populated and view is stable.
          if (currentViewActual === 'code') {
            // Only correct to preview if files are loaded (or no preview exists which implies no files yet or non-previewable project)
            if ((localFiles && Object.keys(localFiles).length > 0)) { 
              // console.log('[Workbench InitialSwitchEffectRevised v4.1] Phase 2: Correcting view to preview because files are loaded.');
              workbenchStore.currentView.set('preview');
              automaticViewCorrectionDone.current = true;
              // console.log('[Workbench InitialSwitchEffectRevised v4.1] Phase 2: automaticViewCorrectionDone set to true');
            }
          } else if (currentViewActual === 'preview') {
             // If it's already preview and files are loaded, then correction is also done.
            if (localFiles && Object.keys(localFiles).length > 0) {
                automaticViewCorrectionDone.current = true;
                // console.log('[Workbench InitialSwitchEffectRevised v4.1] Phase 2: View is already preview and files loaded, correction done.');
            }
          }
        }
        // Dependencies: propsChatStarted to react to chat start.
        // localFiles (or rather, its source workbenchStore.files) changes when files are loaded, which is crucial for Phase 2.
        // currentViewActual is read directly, so not a direct dep, but its changes are what this effect might react to.
      }, [propsChatStarted, files]); // `files` (the store value) is a dependency to re-run when filesMap populates

      useEffect(() => {
        workbenchStore.setDocuments(files);
      }, [files]);

      const onEditorChange = useCallback<OnEditorChange>((update) => {
        workbenchStore.setCurrentDocumentContent(update.content);
      }, []);

      const onEditorScroll = useCallback<OnEditorScroll>((position) => {
        workbenchStore.setCurrentDocumentScrollPosition(position);
      }, []);

      const onFileSelect = useCallback((filePath: string | undefined) => {
        workbenchStore.setSelectedFile(filePath);
        setEditorSelectedFile(filePath);
        // if (workbenchStore.currentView.get() !== 'preview') {
        //   console.log('[Workbench] File selected in editor, switching to preview tab.');
        //   setSelectedView('preview');
        // }
      }, [setEditorSelectedFile]);

      const onFileSave = useCallback(() => {
        workbenchStore.saveCurrentDocument().catch(() => {
          toast.error('Failed to update file content');
        });
      }, []);

      const onFileReset = useCallback(() => {
        workbenchStore.resetCurrentDocument();
      }, []);

      const handleSyncFiles = useCallback(async () => {
        setIsSyncing(true);

        try {
          const directoryHandle = await window.showDirectoryPicker();
          await workbenchStore.syncFiles(directoryHandle);
          toast.success('Files synced successfully');
        } catch (error) {
          console.error('Error syncing files:', error);
          toast.error('Failed to sync files');
        } finally {
          setIsSyncing(false);
        }
      }, []);

      const handleSelectFile = useCallback((filePath: string) => {
        workbenchStore.setSelectedFile(filePath);
        workbenchStore.currentView.set('diff');
      }, []);
      const fileToUint8Array = (file:File):Promise<Uint8Array> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const arrayBuffer = e.target!.result as ArrayBuffer;
            resolve(new Uint8Array(arrayBuffer));
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
      }
      const handleIFrameMessage = (event:any) => {
        const data = event.data as IFrameReplaceMessageData
        console.log(data)
        const msgType = data["msgType"]
        if (msgType == undefined) {
          return
        }
        if (msgType == "save") {
          const newBodyInnerHTML = data.bodyInnerHTML;
          const docFilePath = "/home/project" + new URL(data.baseURI).pathname;
          var docContent = workbenchStore.getDocumentByFile(docFilePath).value
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(docContent, "text/html");
          const bodyElement = xmlDoc.getElementsByTagName("body")[0];
            bodyElement.innerHTML = newBodyInnerHTML;
            console.log(bodyElement)
          const serializer = new XMLSerializer();
          docContent = serializer.serializeToString(xmlDoc);
          workbenchStore.setDocumentContentByFile(docContent, docFilePath)
          workbenchStore.saveFile(docFilePath)
        }

      };

      // Revised useEffect to open index.html (checking public/index.html first, then index.html)
      useEffect(() => {
        console.log('[Workbench] DefaultFileEffect: Running. State:', {
          propsChatStarted,
          currentView: currentViewFromStore,
          selectedFile: selectedFileFromStore,
          initialFileOpened: initialFileOpened.current,
          filesLoaded: files && Object.keys(files).length > 0,
          publicIndexHtmlPath: 'public/index.html',
          rootIndexHtmlPath: 'index.html',
          publicIndexHtmlExists: files && files['public/index.html']?.type === 'file',
          rootIndexHtmlExists: files && files['index.html']?.type === 'file'
        });

        if (
          propsChatStarted &&
          currentViewFromStore === 'code' &&
          files && Object.keys(files).length > 0 &&
          !initialFileOpened.current
        ) {
          console.log('[Workbench] DefaultFileEffect: Files are loaded. Available file paths:', Object.keys(files)); 
          
          let targetPathKey: string | null = null; 
          const publicIndexHtmlMapKey = '/home/project/public/index.html';
          const rootIndexHtmlMapKey = '/home/project/index.html';

          if (files[publicIndexHtmlMapKey] && files[publicIndexHtmlMapKey]?.type === 'file') {
            targetPathKey = publicIndexHtmlMapKey;
          } else if (files[rootIndexHtmlMapKey] && files[rootIndexHtmlMapKey]?.type === 'file') {
            targetPathKey = rootIndexHtmlMapKey;
          }

          if (targetPathKey) {
            // let relativeTargetPath = targetPathKey; // No longer need to calculate relative path here for setSelectedFile
            // const prefix = '/home/project/';
            // if (targetPathKey.startsWith(prefix)) {
            //   relativeTargetPath = targetPathKey.substring(prefix.length);
            // }
            
            // selectedFileFromStore is the current value of the selectedFile atom (should also be a full key if set)
            if (!selectedFileFromStore || selectedFileFromStore !== targetPathKey) {
              console.log(`[Workbench] DefaultFileEffect: Conditions MET. Setting/Overriding selected file to KEY: '${targetPathKey}'. Current selected KEY: ${selectedFileFromStore}`);
              workbenchStore.setSelectedFile(targetPathKey); // Use the full key from the files map
            } else {
              console.log(`[Workbench] DefaultFileEffect: Conditions MET, target KEY '${targetPathKey}' exists, and it's already selected. No action needed.`);
            }
          } else {
            console.log('[Workbench] DefaultFileEffect: Conditions MET, but neither public nor root index.html found with expected keys. Keys inspected:', publicIndexHtmlMapKey, rootIndexHtmlMapKey);
          }
          
          initialFileOpened.current = true;
          console.log('[Workbench] DefaultFileEffect: initialFileOpened.current set to true.');

        } else if (initialFileOpened.current) {
          console.log('[Workbench] DefaultFileEffect: Initial attempt to open a default HTML file already done.');
        } else {
          let unmetConditions = [];
          if (!propsChatStarted) unmetConditions.push('!propsChatStarted');
          if (currentViewFromStore !== 'code') unmetConditions.push('currentView !== code');
          if (!(files && Object.keys(files).length > 0)) unmetConditions.push('files not loaded');
          console.log('[Workbench] DefaultFileEffect: Main conditions NOT MET. Unmet: ', unmetConditions.join(', ') || 'InitialFileOpened is true or other.');
        }
      }, [propsChatStarted, currentViewFromStore, files, selectedFileFromStore]);

      // Temporary effect to log currentDocument when selectedFileFromStore changes
      useEffect(() => {
        const doc = workbenchStore.currentDocument.get();
        const currentSelectedFile = workbenchStore.selectedFile.get(); // Get the latest from store
        console.log('[Workbench] SelectedFile-Watcher: selectedFile in store is now:', currentSelectedFile, 'Current document from store:', doc);
        if (doc) {
          console.log('[Workbench] SelectedFile-Watcher: Document details:', { filePath: doc.filePath, valueExists: !!doc.value, first100Chars: doc.value?.substring(0, 100) + '...' });
        }
      }, [selectedFileFromStore]); // Trigger when selectedFileFromStore (derived from store) changes

      return (
        propsChatStarted && (
          <motion.div
            initial="closed"
            animate={showWorkbench ? 'open' : 'closed'}
            variants={workbenchVariants}
            className="z-workbench h-full"
          >
            <div
              className={classNames(
                'fixed inset-y-0 w-[var(--workbench-width)] z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
                {
                  'w-full': isSmallViewport,
                  'left-0': showWorkbench && isSmallViewport,
                  'left-[var(--workbench-left)]': showWorkbench,
                  'left-[100%]': !showWorkbench,
                },
              )}
            >
              <div className="absolute inset-0 h-full">
                <div className="h-full flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden">
                  <div className="flex items-center px-3 py-2 border-b border-bolt-elements-borderColor gap-2">
                    <Slider selected={currentViewFromStore} options={sliderOptions} setSelected={setSelectedView} />
                    <button
                      className={classNames(
                        'p-1.5 text-xs rounded-lg flex items-center gap-1 text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive',
                        {
                          'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent': showChat,
                        }
                      )}
                      onClick={() => {
                        chatStore.setKey('showChat', !showChat);
                      }}
                      title={showChat ? "Hide Chat Panel" : "Show Chat Panel"}
                    >
                      <div className="i-bolt:chat text-base" />
                    </button>
                    <div className="ml-auto" />
                    {currentViewFromStore === 'code' && (
                      <DeployButton />
                    )}
                    {currentViewFromStore === 'code' && (
                      <div className="flex overflow-y-auto items-center">
                        <PanelHeaderButton
                          className="text-sm"
                          onClick={() => {
                            workbenchStore.downloadZip();
                          }}
                        >
                          <div className="i-ph:code" />
                          下载模板文件
                        </PanelHeaderButton>
                      </div>
                    )}
                    {currentViewFromStore === 'diff' && (
                      <FileModifiedDropdown fileHistory={fileHistory} onSelectFile={handleSelectFile} />
                    )}
                  </div>
                  <div className="relative flex-1 overflow-hidden">
                    <View initial={{ x: '0%' }} animate={{ x: currentViewFromStore === 'code' ? '0%' : '-100%' }}>
                      <EditorPanel
                        editorDocument={currentDocument}
                        isStreaming={isStreaming}
                        selectedFile={selectedFileFromStore}
                        files={files}
                        unsavedFiles={unsavedFiles}
                        fileHistory={fileHistory}
                        onFileSelect={onFileSelect}
                        onEditorScroll={onEditorScroll}
                        onEditorChange={onEditorChange}
                        onFileSave={onFileSave}
                        onFileReset={onFileReset}
                      />
                    </View>
                    <View
                      initial={{ x: '100%' }}
                      animate={{ x: currentViewFromStore === 'diff' ? '0%' : currentViewFromStore === 'code' ? '100%' : '-100%' }}
                    >
                      <DiffView fileHistory={fileHistory} setFileHistory={setFileHistory} actionRunner={actionRunner} />
                    </View>
                    <View initial={{ x: '100%' }} animate={{ x: currentViewFromStore === 'preview' ? '0%' : '100%' }}>
                      <Preview 
                          editorSelectedFile={editorSelectedFile}
                          chatStarted={propsChatStarted}
                      />
                    </View>
                  </div>
                </div>
              </div>
            </div>

            <PushToGitHubDialog
              isOpen={isPushDialogOpen}
              onClose={() => setIsPushDialogOpen(false)}
              onPush={async (repoName, username, token) => {
                try {
                  const commitMessage = prompt('Please enter a commit message:', 'Initial commit') || 'Initial commit';
                  await workbenchStore.pushToGitHub(repoName, commitMessage, username, token);

                  const repoUrl = `https://github.com/${username}/${repoName}`;

                  if (updateChatMestaData && !metadata?.gitUrl) {
                    updateChatMestaData({
                      ...(metadata || {}),
                      gitUrl: repoUrl,
                    });
                  }

                  return repoUrl;
                } catch (error) {
                  console.error('Error pushing to GitHub:', error);
                  toast.error('Failed to push to GitHub');
                  throw error;
                }
              }}
            />

          </motion.div>
        )
      );
    },
  );

// View component for rendering content with motion transitions
interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});
