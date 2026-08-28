"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent } from "@/lib/actions/events";
import { Spinner } from "./submit-button";
import { useToast } from "./toast";
import { useInRouteModal } from "./route-modal";

// イベント削除。モーダル(インターセプトルート)内では router.back() で閉じ、
// フルページ表示では予定表へ遷移する(サーバー側redirectはモーダルと相性が悪い)。
export function EventDelete({ eventId }: { eventId: string }) {
  const router = useRouter();
  const toast = useToast();
  const inModal = useInRouteModal();
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (!window.confirm("このイベントを削除しますか?(参加者にお知らせが届きます)")) {
      return;
    }
    startTransition(async () => {
      await deleteEvent(eventId);
      toast.show("イベントを削除しました");
      if (inModal) router.back();
      else router.push("/schedule");
    });
  };

  return (
    <div className="mt-4 pb-2 text-center">
      <button
        onClick={onDelete}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-accent disabled:opacity-60"
      >
        {pending && <Spinner className="h-3.5 w-3.5" />}
        {pending ? "削除中…" : "このイベントを削除する(参加者にお知らせが届きます)"}
      </button>
    </div>
  );
}
