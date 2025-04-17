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
import { type ChangeEvent, useState } from 'react';
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand, GetObjectAttributesCommand
} from '@aws-sdk/client-s3';
import InputTextDialog from '~/components/@settings/tabs/connections/components/InputTextDialog';


const S3 = new S3Client({
  region: "auto",
  endpoint: `https://fd40d392fc6b30a82529534cf4c2ea74.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: "da405b1953116eef0de1744bb2578135",
    secretAccessKey: "6f6594481404399075036cc1a40e18683995f2d09b18d116832dfebf3aa02945",
  },
});


export default function Test() {
    const [isOpenDialog, setIsOpenDialog] = useState(false);
    const clickxxx = async ()=>{
      setIsOpenDialog(true)
        console.log(11)
    }

    return (
      <div>
      <button onClick={clickxxx}>xxx</button>
      <InputTextDialog isOpen={isOpenDialog} onCancel={()=>{
        console.log("cancel");
        setIsOpenDialog(false)
      }} onConfirm={(content:string)=>{
        console.log("confirm:", content);
        setIsOpenDialog(false)
      }} value={"few"}></InputTextDialog>
      </div>

  );
}
