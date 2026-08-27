import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { IconBack } from "@/components/icons";
import { EventDetail } from "./event-detail";

// 直接URLで開いたとき(またはリロード時)のフルページ表示。
// 予定表などアプリ内からの遷移は @modal のインターセプトでモーダル表示になる。
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <AppHeader title="イベント詳細" />
      <Link
        href="/schedule"
        className="mb-1 flex items-center gap-1 text-[13px] font-bold text-primary"
      >
        <IconBack className="h-4 w-4" />
        予定表へ戻る
      </Link>
      <EventDetail id={id} />
    </>
  );
}
