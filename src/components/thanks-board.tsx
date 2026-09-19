"use client";

import { useRef, useState, useTransition } from "react";
import { cancelThanks, giveThanks } from "@/lib/actions/thanks";
import { THANKS_CLOSED_MESSAGE, THANKS_MESSAGE_MAX } from "@/lib/thanks";
import { IconHeart } from "./icons";
import { FormError } from "./form-error";
import { SubmitButton } from "./submit-button";
import { useToast } from "./toast";
import { Avatar, Card, btnCls, labelCls } from "./ui";

export type ThanksMember = {
  userId: string;
  name: string;
  emoji: string | null;
  image: string | null;
};

export type GivenThanks = {
  id: string;
  toUserId: string;
  toName: string;
  points: number;
  message: string;
  anonymous: boolean;
  timeLabel: string;
};

// ありがとうポイントを送るフォーム+送った履歴(取り消し可)
export function ThanksBoard({
  members,
  budget,
  given,
  closed,
}: {
  members: ThanksMember[]; // 自分以外の承認済みメンバー
  budget: number;
  given: GivenThanks[];
  closed: boolean; // 企画終了後: 送付・取り消し不可(残ポイントは消滅)
}) {
  const [toUserId, setToUserId] = useState<string | null>(null);
  const [points, setPoints] = useState(1);
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  const used = given.reduce((s, g) => s + g.points, 0);
  const remaining = Math.max(0, budget - used);
  const givenTo = (id: string) =>
    given.filter((g) => g.toUserId === id).reduce((s, g) => s + g.points, 0);
  const target = members.find((m) => m.userId === toUserId) ?? null;

  return (
    <>
      {/* 手持ち */}
      <Card className="flex items-center gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-primary-soft">
          <IconHeart className="h-6 w-6 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted">
            {closed ? "手持ちのポイント(終了時に消滅)" : "手持ちのありがとうポイント"}
          </div>
          <div className={`text-xl font-extrabold tabular-nums ${closed ? "text-muted line-through" : ""}`}>
            {remaining}
            <span className="ml-1 text-[12px] font-bold text-muted">/ {budget} pt</span>
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(budget, 10) }, (_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full border border-line ${
                i < Math.round((remaining / budget) * Math.min(budget, 10)) ? "bg-primary" : "bg-line-soft"
              }`}
            />
          ))}
        </div>
      </Card>

      {closed ? (
        <p className="mt-2.5 rounded-[14px] border-2 border-dashed border-line bg-white p-4 text-center text-[12.5px] text-muted shadow-[3px_3px_0_var(--color-line)]">
          {THANKS_CLOSED_MESSAGE}。
        </p>
      ) : (
      <form
        ref={formRef}
        className="mt-2.5 rounded-[14px] border-2 border-line bg-white p-3.5 shadow-[3px_3px_0_var(--color-line)]"
        action={async (formData) => {
          if (submitting.current) return;
          if (!toUserId) {
            setError("送る相手を選んでください");
            return;
          }
          if (remaining === 0) {
            setError("手持ちのポイントがありません");
            return;
          }
          submitting.current = true;
          setError(null);
          try {
            const res = await giveThanks(formData);
            if (res?.error) {
              setError(res.error);
            } else {
              toast.show(`${target?.name ?? ""} さんに ${points} pt 送りました`);
              setMessage("");
              setPoints(1);
              setToUserId(null);
              setAnonymous(false);
            }
          } catch {
            setError("送信に失敗しました。時間をおいて再度お試しください。");
          } finally {
            submitting.current = false;
          }
        }}
      >
        <h3 className="text-sm font-bold">ありがとうを送る</h3>
        <p className="mt-0.5 text-[11.5px] text-muted">
          頑張っている人、企画に大きく協力してくれている人にポイントを送りましょう。同じ人に何度でも送れます。
          コメントは任意で、匿名でも送れます。受け取った人にはすぐ表示され、手元に残ったポイントは企画の終了時に消滅します。
        </p>

        <label className={labelCls}>送る相手</label>
        <input type="hidden" name="toUserId" value={toUserId ?? ""} />
        {members.length === 0 ? (
          <p className="text-[12px] text-muted">送れるメンバーがいません。</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => {
              const active = m.userId === toUserId;
              const sent = givenTo(m.userId);
              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => setToUserId(active ? null : m.userId)}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-full border-2 border-line py-0.5 pr-2.5 pl-0.5 text-[12.5px] font-bold ${
                    active ? "bg-primary text-white" : "bg-white"
                  }`}
                >
                  <Avatar name={m.name} emoji={m.emoji} image={m.image} size={24} />
                  <span className="max-w-[8rem] truncate">{m.name}</span>
                  {sent > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-[10px] ${
                        active ? "bg-white/25" : "bg-primary-soft text-primary"
                      }`}
                    >
                      {sent}pt
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <label className={labelCls}>ポイント</label>
        <input type="hidden" name="points" value={points} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPoints((p) => Math.max(1, p - 1))}
            disabled={points <= 1}
            aria-label="1ポイント減らす"
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border-2 border-line bg-white text-lg font-bold disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-[3.5rem] text-center text-xl font-extrabold tabular-nums">
            {points}
            <span className="ml-0.5 text-[12px] font-bold text-muted">pt</span>
          </span>
          <button
            type="button"
            onClick={() => setPoints((p) => Math.min(Math.max(1, remaining), p + 1))}
            disabled={points >= remaining}
            aria-label="1ポイント増やす"
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border-2 border-line bg-white text-lg font-bold disabled:opacity-40"
          >
            +
          </button>
          <div className="ml-1 flex flex-wrap gap-1">
            {[1, 3, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPoints(Math.min(Math.max(1, remaining), n))}
                disabled={n > remaining}
                className={`rounded-full border-2 border-line px-2.5 py-1 text-[11px] font-bold disabled:opacity-40 ${
                  points === n ? "bg-ink text-screen" : "bg-white"
                }`}
              >
                {n}pt
              </button>
            ))}
          </div>
        </div>

        <label className={labelCls} htmlFor="thanks-message">コメント(任意)</label>
        <textarea
          id="thanks-message"
          name="message"
          rows={3}
          maxLength={THANKS_MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="BBQの火起こしありがとう!"
          className="w-full rounded-[10px] border-2 border-line bg-white px-3 py-2.5 text-sm"
        />
        <p className="mt-1 text-right text-[10.5px] text-muted tabular-nums">
          {[...message].length} / {THANKS_MESSAGE_MAX}
        </p>

        <label className="mt-1 flex items-center gap-2 text-[12.5px] font-bold">
          <input
            type="checkbox"
            name="anonymous"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          匿名で送る
          <span className="text-[11px] font-medium text-muted">(受け取る人に名前が表示されません)</span>
        </label>

        <FormError message={error} />
        <SubmitButton
          className={`${btnCls} mt-3 w-full py-3.5`}
          disabled={!toUserId || remaining === 0}
        >
          {target
            ? `${target.name} さんに ${points} pt ${anonymous ? "匿名で" : ""}送る`
            : "相手を選んでください"}
        </SubmitButton>
      </form>
      )}

      {/* 送った履歴 */}
      <h3 className="mx-0.5 mt-4 mb-2 text-[13px] font-bold text-muted">
        送ったありがとう({given.length})
      </h3>
      {given.length === 0 ? (
        <p className="rounded-[14px] border-2 border-line bg-white p-4 text-center text-[12.5px] text-muted shadow-[3px_3px_0_var(--color-line)]">
          まだ送っていません。
        </p>
      ) : (
        given.map((g) => (
          <Card key={g.id} className="mb-2 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold">
                  {g.toName} さんへ{" "}
                  <span className="rounded-full bg-primary-soft px-1.5 py-px text-[10.5px] font-bold text-primary">
                    {g.points}pt
                  </span>
                  {g.anonymous && (
                    <span className="ml-1 rounded-full bg-line-soft px-1.5 py-px text-[10px] font-bold text-muted">
                      匿名
                    </span>
                  )}
                </div>
                {g.message ? (
                  <p className="mt-0.5 text-[12.5px] leading-relaxed break-words whitespace-pre-wrap">
                    {g.message}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11.5px] text-muted">(コメントなし)</p>
                )}
                <div className="mt-0.5 text-[10.5px] text-muted">{g.timeLabel}</div>
              </div>
              {!closed && (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`${g.toName} さんへの ${g.points} pt を取り消しますか?(手持ちに戻ります)`)) return;
                  startTransition(async () => {
                    const res = await cancelThanks(g.id);
                    toast.show(res?.error ?? "取り消しました");
                  });
                }}
                className="shrink-0 text-[11px] font-bold text-muted underline"
              >
                取り消す
              </button>
              )}
            </div>
          </Card>
        ))
      )}
    </>
  );
}
