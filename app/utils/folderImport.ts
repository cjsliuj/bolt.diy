import type { Message } from 'ai';
import { generateId } from './fileUtils';
import { detectProjectCommands, createCommandsMessage, escapeBoltTags } from './projectCommands';
import i18n from '~/i18n';


export const createChatFromFileArtifacts = async (
  fileArtifacts: {content:string, path:string}[],
  binaryFiles: string[],
  folderName: string,
): Promise<Message[]> => {
  const commands = await detectProjectCommands(fileArtifacts);
  const commandsMessage = createCommandsMessage(commands);
  const binaryFilesDetails =
    binaryFiles.length > 0
      ? i18n.t('systemMessages.skippedBinaryFilesList', { count: binaryFiles.length, fileList: binaryFiles.map((f) => `- ${f}`).join('\n') })
      : '';

  const filesMessage: Message = {
    role: 'assistant',
    content:
      i18n.t('systemMessages.importedFolderContents', { folderName, binaryFilesDetails }) +
      `
      <boltArtifact id="imported-files" title="Imported Files" type="bundled" >
      ${fileArtifacts
        .map(
          (file) =>
            `<boltAction type="file" filePath="${file.path}">
            ${escapeBoltTags(file.content)}
            </boltAction>`,
        )
        .join('\n\n')}
      </boltArtifact>`,
    id: generateId(),
    createdAt: new Date(),
  };

  const userMessage: Message = {
    role: 'user',
    id: generateId(),
    content: i18n.t('systemMessages.importFolderUser', "Import the \"{{folderName}}\" folder", { folderName }),
    createdAt: new Date(),
  };

  const messages = [userMessage, filesMessage];

  if (commandsMessage) {
    messages.push({
      role: 'user',
      id: generateId(),
      content: i18n.t('systemMessages.setupAndStartAppUser', 'Setup the codebase and Start the application'),
    });
    messages.push(commandsMessage);
  }

  return messages;
};

export const createChatFromFolder = async (
  files: File[],
  binaryFiles: string[],
  folderName: string,
): Promise<Message[]> => {
  const fileArtifacts = await Promise.all(
    files.map(async (file) => {
      return new Promise<{ content: string; path: string }>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const content = reader.result as string;
          const relativePath = file.webkitRelativePath.split('/').slice(1).join('/');
          resolve({
            content,
            path: relativePath,
          });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }),
  );
  const commands = await detectProjectCommands(fileArtifacts);
  const commandsMessage = createCommandsMessage(commands);
  const binaryFilesDetails =
    binaryFiles.length > 0
      ? i18n.t('systemMessages.skippedBinaryFilesList', { count: binaryFiles.length, fileList: binaryFiles.map((f) => `- ${f}`).join('\n') })
      : '';

  const filesMessage: Message = {
    role: 'assistant',
    content:
      i18n.t('systemMessages.importedFolderContents', { folderName, binaryFilesDetails }) +
      `
      <boltArtifact id="imported-files" title="Imported Files" type="bundled" >
      ${fileArtifacts
        .map(
          (file) =>
            `<boltAction type="file" filePath="${file.path}">
            ${escapeBoltTags(file.content)}
            </boltAction>`,
        )
        .join('\n\n')}
      </boltArtifact>`,
    id: generateId(),
    createdAt: new Date(),
  };

  const userMessage: Message = {
    role: 'user',
    id: generateId(),
    content: i18n.t('systemMessages.importFolderUser', "Import the \"{{folderName}}\" folder", { folderName }),
    createdAt: new Date(),
  };

  const messages = [userMessage, filesMessage];

  if (commandsMessage) {
    messages.push({
      role: 'user',
      id: generateId(),
      content: i18n.t('systemMessages.setupAndStartAppUser', 'Setup the codebase and Start the application'),
    });
    messages.push(commandsMessage);
  }

  return messages;
};
