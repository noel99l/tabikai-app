"use client";

import { useTransition } from "react";
import { grantAdmin } from "@/lib/actions/trips";
import { Spinner } from "./submit-button";
import { useToast } from "./toast";

// メンバー一覧から管理者権限を付与するボタン(確認ダイアログつき)
export function GrantAdminButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const onGrant = () => {
    if (!window.confirm(`${name} さんを管理者にしますか?`)) return;
    startTransition(async () => {
      await grantAdmin(userId);
      toast.show(`${name} さんを管理者にしました`);
    });
  };

  return (
    <button
      onClick={onGrant}
      disabled={pending}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-line bg-white px-2.5 py-1 text-[11px] font-bold text-ink disabled:opacity-60"
    >
      {pending && <Spinner className="h-3 w-3" />}
      管理者にする
    </button>
  );
}
