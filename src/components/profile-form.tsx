"use client";

import { useRef, useState } from "react";
import { resizeToSquareDataUrl } from "@/lib/square-image";
import { SubmitButton } from "./submit-button";
import { useToast } from "./toast";
import { FormError } from "./form-error";
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
  defaultImage = null,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<Result>;
  defaultName: string;
  defaultEmoji: string | null;
  defaultImage?: string | null;
  submitLabel: string;
}) {
  const [name, setName] = useState(defaultName);
  const [emoji, setEmoji] = useState<string | null>(defaultEmoji ?? null);
  // 画像は絵文字より優先。画像を選ぶと絵文字の選択は表示上使われない
  const [image, setImage] = useState<string | null>(defaultImage ?? null);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const toast = useToast();

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setImageBusy(true);
    try {
      setImage(await resizeToSquareDataUrl(file));
    } catch {
      setError("画像の読み込みに失敗しました。");
    } finally {
      setImageBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <form
      action={async (formData) => {
        if (submitting.current) return;
        submitting.current = true;
        setError(null);
        try {
          const res = await action(formData);
          if (res?.error) {
            setError(res.error);
            submitting.current = false;
          } else {
            toast.show("保存しました");
            submitting.current = false;
          }
          // 成功時は action 内で redirect / revalidate される(onboarding)
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
          submitting.current = false;
        }
      }}
    >
      <div className="mb-4 flex flex-col items-center gap-2">
        <Avatar name={name || "?"} emoji={emoji} image={image} size={72} />
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

      <label className={labelCls}>アイコン画像(任意)</label>
      <input type="hidden" name="avatarImage" value={image ?? ""} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => pickImage(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={imageBusy}
          className="rounded-lg bg-primary-soft px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
        >
          {imageBusy ? "処理中…" : image ? "画像を変更" : "写真を選ぶ"}
        </button>
        {image && (
          <button
            type="button"
            onClick={() => setImage(null)}
            disabled={imageBusy}
            className="rounded-lg border-2 border-line bg-white px-3 py-2 text-xs font-bold text-muted disabled:opacity-50"
          >
            画像を外す
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        正方形に切り抜いて縮小されます。画像があるときは絵文字より優先して表示されます。
      </p>

      <label className={labelCls}>アイコン(絵文字・任意)</label>
      <input type="hidden" name="avatarEmoji" value={emoji ?? ""} />
      <div className={`grid grid-cols-8 gap-1.5 ${image ? "opacity-50" : ""}`}>
        <button
          type="button"
          onClick={() => {
            setEmoji(null);
            setImage(null);
          }}
          className={`flex aspect-square items-center justify-center rounded-lg border text-[11px] ${
            emoji === null && !image ? "border-primary bg-primary-soft" : "border-line bg-white"
          }`}
          aria-label="頭文字を使う"
        >
          文字
        </button>
        {EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => {
              setEmoji(e);
              setImage(null);
            }}
            className={`flex aspect-square items-center justify-center rounded-lg border text-lg ${
              emoji === e && !image ? "border-primary bg-primary-soft" : "border-line bg-white"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <FormError message={error} />

      <SubmitButton className={`${btnCls} mt-5 w-full py-3.5`}>{submitLabel}</SubmitButton>
    </form>
  );
}
