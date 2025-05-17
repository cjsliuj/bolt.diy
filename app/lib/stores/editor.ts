import { atom, computed, map, type MapStore, type WritableAtom } from 'nanostores';
import type { EditorDocument, ScrollPosition } from '~/components/editor/codemirror/CodeMirrorEditor';
import type { FileMap, FilesStore } from './files';

export type EditorDocuments = Record<string, EditorDocument>;

// Define atoms at the module level, ensuring they are always valid store objects.
// Use different HMR keys to avoid conflict if old keys are still somehow present.
const selectedFileAtomInstance: WritableAtom<string | undefined> = 
  import.meta.hot?.data.editorSelectedFileAtom ?? atom<string | undefined>();

const documentsAtomInstance: MapStore<EditorDocuments> = 
  import.meta.hot?.data.editorDocumentsAtom ?? map<EditorDocuments>({});

// Persist these module-level atoms in HMR data.
if (import.meta.hot) {
  import.meta.hot.data.editorSelectedFileAtom = selectedFileAtomInstance;
  import.meta.hot.data.editorDocumentsAtom = documentsAtomInstance;
}

// Make sure the PROJECT_ROOT_PREFIX is defined correctly, usually '/home/project/'
const PROJECT_ROOT_PREFIX = '/home/project/';

export const currentDocument = computed(
  [selectedFileAtomInstance, documentsAtomInstance], // Use the robustly defined atoms
  (selectedFileValue, documentsObject) => { // documentsObject is the plain object from documentsAtomInstance
    if (!selectedFileValue) {
      return undefined;
    }

    // 1. Try selectedFileValue as is (it might be an absolute path matching a document key)
    let doc = documentsObject[selectedFileValue];
    if (doc) {
      return doc;
    }

    // 2. If not found, and selectedFileValue does not start with the prefix, assume it's a relative path.
    //    Prepend the prefix and try again.
    if (!selectedFileValue.startsWith(PROJECT_ROOT_PREFIX) && !selectedFileValue.startsWith('/')) {
      const absolutePathAttempt = PROJECT_ROOT_PREFIX + selectedFileValue;
      doc = documentsObject[absolutePathAttempt];
      if (doc) {
        return doc;
      }
    }
    
    // 3. If attempts fail, return undefined.
    return undefined; 
  }
);

export class EditorStore {
  #filesStore: FilesStore;

  // These now reference the module-level atoms
  selectedFile: WritableAtom<string | undefined> = selectedFileAtomInstance;
  documents: MapStore<EditorDocuments> = documentsAtomInstance;

  constructor(filesStore: FilesStore) {
    this.#filesStore = filesStore;

    // HMR data for these atoms is handled at the module level, so remove from constructor.
    // if (import.meta.hot) {
    //   import.meta.hot.data.documents = this.documents; // Old HMR keys
    //   import.meta.hot.data.selectedFile = this.selectedFile; // Old HMR keys
    // }
  }

  setDocuments(files: FileMap) {
    const previousDocuments = this.documents.get(); // .get() on MapStore returns the object value

    this.documents.set( // .set() on MapStore replaces the entire object value
      Object.fromEntries<EditorDocument>(
        Object.entries(files)
          .map(([filePath, dirent]) => {
            if (dirent === undefined || dirent.type === 'folder') {
              return undefined;
            }

            const previousDocument = previousDocuments[filePath]; // Access as object property

            return [
              filePath,
              {
                value: dirent.content,
                filePath,
                scroll: previousDocument?.scroll,
              },
            ] as [string, EditorDocument];
          })
          .filter(Boolean) as Array<[string, EditorDocument]>,
      ),
    );
  }

  setSelectedFile(filePath: string | undefined) {
    this.selectedFile.set(filePath);
  }

  updateScrollPosition(filePath: string, position: ScrollPosition) {
    const documentsObject = this.documents.get();
    const documentState = documentsObject[filePath];

    if (!documentState) {
      return;
    }

    // For MapStore, to update a key, you modify the object and then .set() the new object,
    // or use .setKey() if you want fine-grained updates that don't replace the whole object reference.
    // Nanostores' map.setKey() is for updating a property within the map store's object.
    this.documents.setKey(filePath, {
      ...documentState,
      scroll: position,
    });
  }

  updateFile(filePath: string, newContent: string) {
    const documentsObject = this.documents.get();
    const documentState = documentsObject[filePath];

    if (!documentState) {
      return;
    }

    const currentContent = documentState.value;
    const contentChanged = currentContent !== newContent;

    if (contentChanged) {
      this.documents.setKey(filePath, {
        ...documentState,
        value: newContent,
      });
    }
  }
}
