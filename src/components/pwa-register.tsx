"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 登録失敗は致命的ではないので握りつぶす(プッシュ購読時に再検出する)
      });
    }
  }, []);
  return null;
}
