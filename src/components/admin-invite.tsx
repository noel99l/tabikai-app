"use client";

import { useState } from "react";
import { createAdminInvite } from "@/lib/actions/trips";

export function AdminInvite({ origin }: { origin: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const token = await createAdminInvite();
      setUrl(`${origin}/admin-invite/${token}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-bold">管理者を追加</h3>
      <p className="mt-1 mb-2 text-[11.5px] text-muted">
        発行したURLを既存メンバーに共有すると、開いた人が管理者になります(複数人可)。
      </p>
      {url ? (
        <p className="rounded-lg bg-screen px-2.5 py-2 text-[11.5px] break-all select-all">
          {url}
        </p>
      ) : (
        <button
          onClick={generate}
          disabled={busy}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {busy ? "発行中…" : "管理者招待リンクを発行"}
        </button>
      )}
    </div>
  );
}
