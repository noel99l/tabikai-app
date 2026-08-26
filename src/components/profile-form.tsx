"use client";

import { useRef, useState } from "react";
import { Avatar, btnCls, inputCls, labelCls } from "./ui";

const EMOJI_CHOICES = [
  "😀", "😎", "🤩", "🥳", "😺", "🐶", "🐰", "🦊",
  "🐻", "🐼", "🐨", "🦁", "🐸", "🐵", "🦄", "🐧",
  "🍺", "🍜", "🎸", "⚽", "🏔️", "🌊", "🔥", "⭐",
];

type Result = { error?: string } | void;

export function ProfileForm({
  action,
  defaultName,
  defaultEmoji,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<Result>;
  defaultName: string;
  defaultEmoji: string | null;
  submitLabel: string;
}) {
  const [name, setName] = useState(defaultName);
  const [emoji, setEmoji] = useState<string | null>(defaultEmoji ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  return (
    <form
      action={async (formData) => {
        if (submitting.current) return;
        submitting.current = true;
        setPending(true);
        setError(null);
        try {
          const res = await action(formData);
          if (res?.error) {
            setError(res.error);
            setPending(false);
            submitting.current = false;
          }
          // 成功時は action 内で redirect / revalidate される
        } catch (err) {
          // 成功時の redirect は例外として伝播するため、失敗と誤表示しない
          if (
            err &&
            typeof err === "object" &&
            "digest" in err &&
            String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
          ) {
            throw err;
          }
          setError("保存に失敗しました。");
          setPending(false);
          submitting.current = false;
        }
      }}
    >
      <div className="mb-4 flex flex-col items-center gap-2">
        <Avatar name={name || "?"} emoji={emoji} size={72} />
        <span className="text-[11.5px] text-muted">プレビュー</span>
      </div>

      <label className={labelCls} htmlFor="name">表示名</label>
      <input
        className={inputCls}
        id="name"
        name="name"
        required
        maxLength={20}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ゆうすけ"
      />

      <label className={labelCls}>アイコン(絵文字・任意)</label>
      <input type="hidden" name="avatarEmoji" value={emoji ?? ""} />
      <div className="grid grid-cols-8 gap-1.5">
        <button
          type="button"
          onClick={() => setEmoji(null)}
          className={`flex aspect-square items-center justify-center rounded-lg border text-[11px] ${
            emoji === null ? "border-primary bg-primary-soft" : "border-line bg-white"
          }`}
          aria-label="頭文字を使う"
        >
          文字
        </button>
        {EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={`flex aspect-square items-center justify-center rounded-lg border text-lg ${
              emoji === e ? "border-primary bg-primary-soft" : "border-line bg-white"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] font-bold text-accent">
          {error}
        </p>
      )}

      <button className={`${btnCls} mt-5 w-full py-3.5`} disabled={pending}>
        {pending ? "保存中…" : submitLabel}
      </button>
    </form>
  );
}
