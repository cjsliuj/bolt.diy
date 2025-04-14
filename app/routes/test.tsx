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


export default function Test() {

    const clickxxx = async ()=>{

    }

    const onfilechanged = async (e: ChangeEvent<HTMLInputElement>)=>{
      const file = e.target.files?.[0];
      console.log(file)

      const observer = {
        next(res:{}){
          console.log("res", res);
        },
        error(err:{}){
          console.log("err:",err);
        },
        complete(res:{"key":string}){
          console.log("complete:", res["key"])
        }
      }
      const token = "VDP1TMdmEwEwANypomnZP-eVyNCCuKWU2zK4pGle:TlxOBZrlDdjeVIWaz-6kWgSBqRE=:eyJzY29wZSI6ImFpeWFyZCIsInJldHVybkJvZHkiOiJ7XCJrZXlcIjpcIiQoa2V5KVwiLFwiaGFzaFwiOlwiJChldGFnKVwiLFwiZnNpemVcIjokKGZzaXplKSxcImJ1Y2tldFwiOlwiJChidWNrZXQpXCIsXCJuYW1lXCI6XCIkKHg6bmFtZSlcIn0iLCJkZWFkbGluZSI6MTc0NTQ5NTY1M30="
      const observable = qiniu.upload(file!, null, token, {}, { });
      const subscription = observable.subscribe(observer)

      var fileInput = document.getElementById('chat-import') as HTMLInputElement;
      fileInput!.value = ""
    }

    return (
      <div>
        <input type="file" id="chat-import" className="hidden" accept=".png" hidden={true} onChange={onfilechanged}/>
        <button onClick={() => {
          const input = document.getElementById('chat-import');
          input?.click();
        }} disabled={!clickxxx}>aaaaaaa</button>
      </div>


  );
}
