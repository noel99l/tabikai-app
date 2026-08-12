"use client";

import { useEffect, useRef } from "react";
import { markAllRead } from "@/lib/actions/notifications";

// お知らせ一覧を表示したら未読を既読化する
export function MarkRead() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const t = setTimeout(() => void markAllRead(), 1200);
    return () => clearTimeout(t);
  }, []);
  return null;
}
