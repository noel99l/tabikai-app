"use client";

import { useTransition } from "react";
import { revokeAdmin } from "@/lib/actions/trips";
import { Spinner } from "./submit-button";
import { useToast } from "./toast";

// メンバー管理から他の管理者の権限を外すボタン(確認ダイアログつき)
export function RevokeAdminButton({ userId, name }: { userId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const onRevoke = () => {
    if (!window.confirm(`${name} さんの管理者権限を外して一般メンバーに戻しますか?`)) return;
    startTransition(async () => {
      await revokeAdmin(userId);
      toast.show(`${name} さんの管理者権限を外しました`);
    });
  };

  return (
    <button
      type="button"
      onClick={onRevoke}
      disabled={pending}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-line bg-white px-2.5 py-1 text-[11px] font-bold text-muted disabled:opacity-60"
    >
      {pending && <Spinner className="h-3 w-3" />}
      権限を外す
    </button>
  );
}
