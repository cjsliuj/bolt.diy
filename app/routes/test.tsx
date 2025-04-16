import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { AutoImportChat, Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { useLoaderData, useNavigate } from '@remix-run/react';
import * as qiniu from 'qiniu-js';
import { toast } from 'react-toastify';
import type { ChangeEvent } from 'react';
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand, GetObjectAttributesCommand
} from '@aws-sdk/client-s3';

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://fd40d392fc6b30a82529534cf4c2ea74.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: "da405b1953116eef0de1744bb2578135",
    secretAccessKey: "6f6594481404399075036cc1a40e18683995f2d09b18d116832dfebf3aa02945",
  },
});


export default function Test() {
  function fileToUint8Array(file:File):Promise<Uint8Array> {
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
    const clickxxx = async ()=>{


    }

    const onfilechanged = async (e: ChangeEvent<HTMLInputElement>)=>{
      const file = e.target.files?.[0];
      const fileBuffer = await fileToUint8Array(file!);
      const fname = Date.now().toString() + ".png";
      const input = { // ListBucketsRequest
        Bucket:"mytest",
        Key:fname,
        Body:fileBuffer,
        ContentType:"image/png",
      };

      const command = new PutObjectCommand(input);
      const response = await S3.send(command);
      console.log(response);

      var fileInput = document.getElementById('chat-import') as HTMLInputElement;
      fileInput!.value = ""
    }

    return (
      <div>
        <input type="file" id="chat-import" className="hidden" accept=".png" hidden={true} onChange={onfilechanged}/>
        <button onClick={() => {
          // const input = document.getElementById('chat-import');
          // input?.click();
          clickxxx();
        }} disabled={!clickxxx}>aaaaaaa</button>
      </div>


  );
}
