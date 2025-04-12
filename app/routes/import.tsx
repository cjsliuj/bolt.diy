import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { AutoImportChat, Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { useLoaderData, useNavigate } from '@remix-run/react';

export const loader = async ({ request: _request }: LoaderFunctionArgs) => {
  const url = new URL(_request.url);
  const asseturl = url.searchParams.get("asset")
  return json({asseturl:asseturl})
};
export default function Index() {
  const { asseturl } = useLoaderData<typeof loader>();
  return (
    <ClientOnly fallback={<BaseChat />}>{() => <AutoImportChat asseturl={asseturl}></AutoImportChat>}</ClientOnly>
  );
}
