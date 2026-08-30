"use client";

import { useRef, useState } from "react";
import { addEventComment, deleteEventComment } from "@/lib/actions/events";
import { Avatar } from "./ui";
import { SubmitButton } from "./submit-button";

type Comment = {
  id: string;
  userId: string;
  name: string;
  emoji: string | null;
  body: string;
  timeLabel: string;
};

// イベント詳細に埋め込むコメント欄(投稿・自分の削除)
export function EventComments({
  eventId,
  comments,
  selfId,
  isAdmin,
}: {
  eventId: string;
  comments: Comment[];
  selfId: string;
  isAdmin: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-2.5 rounded-[14px] border-2 border-line bg-white p-3.5 shadow-[3px_3px_0_var(--color-line)]">
      <h3 className="mb-2 text-sm font-bold">
        コメント <span className="font-medium text-muted">{comments.length}件</span>
      </h3>

      {comments.length === 0 && (
        <p className="mb-1 text-[11.5px] text-muted">
          まだコメントはありません。相談や連絡に使ってください。
        </p>
      )}
      <div className="flex flex-col gap-2.5">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2">
            <Avatar name={c.name} emoji={c.emoji} size={28} />
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-bold">
                {c.name}
                <span className="ml-1.5 font-medium text-muted">{c.timeLabel}</span>
              </div>
              <div className="mt-0.5 w-fit max-w-full rounded-[4px_12px_12px_12px] border-2 border-line bg-screen px-2.5 py-1.5 text-[12.5px] leading-relaxed break-words whitespace-pre-wrap">
                {c.body}
              </div>
            </div>
            {(c.userId === selfId || isAdmin) && (
              <form
                action={async () => {
                  if (!window.confirm("このコメントを削除しますか?")) return;
                  await deleteEventComment(c.id);
                }}
              >
                <button
                  className="mt-4 shrink-0 text-muted"
                  aria-label="コメントを削除"
                  type="submit"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </form>
            )}
          </div>
        ))}
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          setError(null);
          const res = await addEventComment(eventId, formData);
          if (res?.error) {
            setError(res.error);
            return;
          }
          formRef.current?.reset();
        }}
        className="mt-3 flex items-end gap-2"
      >
        <textarea
          name="body"
          required
          maxLength={500}
          rows={1}
          placeholder="コメントを書く…"
          className="min-h-[42px] flex-1 resize-y rounded-[14px] border-2 border-line bg-white px-3.5 py-2.5 text-[12.5px]"
        />
        <SubmitButton className="shrink-0 rounded-full border-2 border-line bg-primary px-4 py-2.5 text-[12px] font-bold text-white shadow-[2px_2px_0_var(--color-line)]">
          送信
        </SubmitButton>
      </form>
      {error && <p className="mt-1.5 text-[11.5px] font-bold text-primary">{error}</p>}
      <p className="mt-1.5 text-[10.5px] text-muted">
        コメントはこのイベントの参加者・招待中のメンバーに通知されます。
      </p>
    </div>
  );
}
