"use client";

import { useTransition } from "react";
import { removeMember } from "@/lib/actions/trips";
import { Spinner } from "./submit-button";
import { useToast } from "./toast";

// メンバー管理からメンバーを企画から外すボタン(確認ダイアログつき・管理者のみ表示)
export function RemoveMemberButton({ userId, name }: { userId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const onRemove = () => {
    if (
      !window.confirm(
        `${name} さんをこの企画のメンバーから外しますか?\n\n・イベントの参加登録・招待は解除されます\n・費用の分担やありがとうポイントの記録は残ります\n・再参加には招待リンクからの申請が必要です`,
      )
    )
      return;
    startTransition(async () => {
      await removeMember(userId);
      toast.show(`${name} さんをメンバーから外しました`);
    });
  };

  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={pending}
      aria-label={`${name} さんをメンバーから外す`}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-line bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent disabled:opacity-60"
    >
      {pending && <Spinner className="h-3 w-3" />}
      外す
    </button>
  );
}
