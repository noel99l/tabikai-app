"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markNotificationRead } from "@/lib/actions/notifications";
import { IconBell } from "./icons";
import { Modal } from "./modal";

type NotifItem = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  createdLabel: string;
  read: boolean;
};

export function NotificationBell({
  unread,
  latest,
}: {
  unread: number;
  latest: NotifItem[];
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const openNotif = (n: NotifItem) => {
    if (!n.read) startTransition(() => void markNotificationRead(n.id));
    setOpen(false);
    router.push(n.link ?? "/notifications");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="お知らせ"
        className="relative p-0.5"
      >
        <IconBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-accent px-1 text-[9.5px] font-extrabold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="お知らせ">
        {latest.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-muted">
            お知らせはまだありません。
          </p>
        ) : (
          latest.map((n) => (
            <button
              key={n.id}
              onClick={() => openNotif(n)}
              className="relative mb-2 flex w-full items-start gap-2.5 rounded-xl border border-line bg-white p-3 text-left"
            >
              {!n.read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
              )}
              {n.read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[13.5px] ${n.read ? "font-semibold text-muted" : "font-bold"}`}
                >
                  {n.title}
                </span>
                {n.body && (
                  <span className="block truncate text-xs text-muted">{n.body}</span>
                )}
                <span className="mt-0.5 block text-[10.5px] text-muted">
                  {n.createdLabel}
                </span>
              </span>
            </button>
          ))
        )}
        <button
          onClick={() => {
            setOpen(false);
            router.push("/notifications");
          }}
          className="mt-2 w-full rounded-lg bg-primary-soft px-4 py-2.5 text-center text-[13px] font-bold text-primary"
        >
          すべてのお知らせを見る
        </button>
      </Modal>
    </>
  );
}
