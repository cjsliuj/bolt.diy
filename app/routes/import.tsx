import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { AutoImportChat, Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { useLoaderData, useNavigate } from '@remix-run/react';

export const loader = async ({ request: _request }: LoaderFunctionArgs) => {
  const url = new URL(_request.url);
  const importAssetid = url.searchParams.get("assetid")
  return json({importAssetid:importAssetid})
};
export default function Index() {
  const { importAssetid } = useLoaderData<typeof loader>();
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
       asset import
      <ClientOnly fallback={<BaseChat />}>{() => <AutoImportChat assetid={importAssetid}></AutoImportChat>}</ClientOnly>
    </div>
  );
}
