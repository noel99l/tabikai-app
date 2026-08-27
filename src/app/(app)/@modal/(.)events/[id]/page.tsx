import { EventDetail } from "../../../events/[id]/event-detail";
import { RouteModal } from "@/components/route-modal";

// アプリ内から /events/[id] へ遷移したときはページ遷移せず、
// 飛び出すアニメーション付きのモーダルで詳細を表示する
export default async function EventModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RouteModal title="イベント詳細">
      <EventDetail id={id} />
    </RouteModal>
  );
}
