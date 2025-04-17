import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { AutoImportChat, Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { useLoaderData, useNavigate } from '@remix-run/react';
import * as qiniu from 'qiniu-js';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import * as Dialog from '@radix-ui/react-dialog';
import { type ChangeEvent, useEffect, useState } from 'react';
import { color } from '@xterm/xterm/src/common/Color';
import isOpaque = color.isOpaque;
import { motion } from 'framer-motion';

interface InputTextDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (content: string) => void;
  value:string;
}
export default function InputTextDialog(props: InputTextDialogProps) {
  const [inputVal, setInputVal] = useState("");
  useEffect(() => {
    setInputVal(props.value);
  }, [props.value]);
  function onClickCancelBtn() {
      props.onCancel()
  }

  function onClickOKBtn() {
    props.onConfirm((document.getElementById("contentInput") as HTMLInputElement).value);
  }


  return (
      <Dialog.Root open={props.isOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" />
          <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[90vw] md:w-[500px]"
          >
            <Dialog.Content className="bg-white dark:bg-[#0A0A0A] rounded-lg p-6 border border-[#E5E5E5] dark:border-[#1A1A1A] shadow-xl">

            <Dialog.Title className="text-lg font-medium text-bolt-elements-textPrimary mb-4">
              输入文字
            </Dialog.Title>
            <div className="space-y-4">
              <div>
                <input
                  id="contentInput"
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className={classNames(
                    'w-full px-3 py-2 rounded-lg',
                    'bg-[#F5F5F5] dark:bg-[#1A1A1A]',
                    'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                    'text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary',
                    'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                  )}
                  required
                />
              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClickCancelBtn}
                className={classNames(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'text-bolt-elements-textPrimary',
                  'bg-[#F5F5F5] dark:bg-[#1A1A1A]',
                  'hover:bg-purple-500/10 hover:text-purple-500',
                  'dark:hover:bg-purple-500/20 dark:hover:text-purple-500',
                  'transition-colors',
                )}
              >
                取消
              </button>
              <button
                type="button"
                onClick={onClickOKBtn}
                className={classNames(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'text-white bg-purple-500',
                  'hover:bg-purple-600',
                  'transition-colors',
                )}
              >
                确认
              </button>
            </div>

          </Dialog.Content>
          </motion.div>
          </div>
        </Dialog.Portal>
      </Dialog.Root>

  );
}
