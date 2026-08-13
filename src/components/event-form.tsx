"use client";

import { useState } from "react";
import { createEvent } from "@/lib/actions/events";
import { Spinner } from "./submit-button";
import { btnCls, inputCls, labelCls } from "./ui";

type Props = {
  venues: { id: string; name: string }[];
  days: { key: string; label: string }[];
  members: { userId: string; name: string }[];
  selfId: string;
};

export function EventForm({ venues, days, members, selfId }: Props) {
  const [inviteAll, setInviteAll] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        setError(null);
        try {
          const res = await createEvent(formData);
          if (res?.error) {
            setError(res.error);
            setPending(false);
          }
        } catch (e) {
          // redirect() は NEXT_REDIRECT 例外として飛ぶので握りつぶさない
          const digest =
            e && typeof e === "object" && "digest" in e ? String(e.digest) : "";
          if (digest.startsWith("NEXT_REDIRECT")) throw e;
          setError("作成に失敗しました。時間をおいて再度お試しください。");
          setPending(false);
        }
      }}
    >
      <label className={labelCls} htmlFor="title">イベント名</label>
      <input className={inputCls} id="title" name="title" required placeholder="花火大会" />

      <label className={labelCls} htmlFor="venueId">会場</label>
      <select className={inputCls} id="venueId" name="venueId" required>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelCls} htmlFor="date">日付</label>
          <select className={inputCls} id="date" name="date" required>
            {days.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="start">開始</label>
          <input className={inputCls} id="start" name="start" type="time" required defaultValue="19:30" />
        </div>
        <div>
          <label className={labelCls} htmlFor="end">終了</label>
          <input className={inputCls} id="end" name="end" type="time" required defaultValue="20:30" />
        </div>
      </div>

      <label className={labelCls} htmlFor="description">説明(任意)</label>
      <input className={inputCls} id="description" name="description" placeholder="持ち物や集合場所など" />

      <label className="mt-4 flex items-start gap-2.5 rounded-[10px] bg-primary-soft p-3">
        <input
          type="checkbox"
          name="inviteAll"
          checked={inviteAll}
          onChange={(e) => setInviteAll(e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-primary"
        />
        <span>
          <span className="block text-[13px] font-bold">全員を招待する</span>
          <span className="block text-[11.5px] text-primary">
            オフにすると招待するメンバーを個別に選べます。
          </span>
        </span>
      </label>

      {!inviteAll && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {members
            .filter((m) => m.userId !== selfId)
            .map((m) => (
              <label
                key={m.userId}
                className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] has-checked:border-primary has-checked:bg-primary has-checked:text-white"
              >
                <input type="checkbox" name="memberIds" value={m.userId} className="sr-only" />
                {m.name}
              </label>
            ))}
        </div>
      )}

      <p className="mx-0.5 mt-3.5 text-[11.5px] text-muted">
        同一会場・同一時間帯は早い者勝ちで、重複する場合は作成できません。
        参加者には開始5分前に自動でリマインド通知が届きます(各自オフ可)。
      </p>

      {error && (
        <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] font-bold text-accent">
          {error}
        </p>
      )}

      <button
        className={`${btnCls} mt-3 flex w-full items-center justify-center gap-2 py-3.5`}
        disabled={pending}
      >
        {pending && <Spinner />}
        {pending ? "作成中…" : "会場を予約してイベントを作成"}
      </button>
    </form>
  );
}
