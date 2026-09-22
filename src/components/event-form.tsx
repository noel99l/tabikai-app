"use client";

import { useEffect, useRef, useState } from "react";
import { createEvent } from "@/lib/actions/events";
import {
  EVENT_COLORS,
  EVENT_ICON_KEYS,
  EVENT_ICON_LABELS,
  EventIcon,
  eventSwatchClass,
} from "./event-icons";
import { SubmitButton } from "./submit-button";
import { useToast } from "./toast";
import { FormError } from "./form-error";
import { btnCls, inputCls, labelCls } from "./ui";

// 重複チェック用の既存イベント(同じ会場・時間帯に重なるものを保存前に知らせる)
export type ExistingEvent = { id: string; title: string; venueId: string; startMs: number; endMs: number };

type Props = {
  venues: { id: string; name: string }[];
  days: { key: string; label: string }[];
  members: { userId: string; name: string }[];
  selfId: string;
  existing?: ExistingEvent[];
  // 予定表の範囲選択からのプリセット
  defaults?: { venueId?: string; date?: string; start?: string; end?: string };
  // 作成成功時(モーダルを閉じる等)
  onSuccess?: () => void;
};

// 入力途中の内容を端末に保持するキーと期限(モーダルを閉じても・画面が更新されても復元できる)
const DRAFT_KEY = "event-create-draft";
const DRAFT_TTL = 24 * 60 * 60 * 1000;
type Draft = {
  at: number;
  fields: Record<string, string>; // name → value(テキスト系の入力)
  inviteMode: "members" | "all" | "solo";
  invitees: string[];
  allDay: boolean;
  color: string;
  icon: string | null;
};

// フォームの日時入力から開始・終了(ms, JST)を求める。未入力なら null
function rangeFromForm(form: HTMLFormElement, allDay: boolean): { start: number; end: number } | null {
  const v = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "";
  const date = v("date");
  const endDate = v("endDate") || date;
  if (!date) return null;
  if (allDay) {
    const s = new Date(`${date}T00:00:00+09:00`).getTime();
    const e = new Date(`${endDate}T00:00:00+09:00`).getTime() + 24 * 60 * 60 * 1000;
    return e > s ? { start: s, end: e } : null;
  }
  const start = v("start");
  const end = v("end");
  if (!start || !end) return null;
  const s = new Date(`${date}T${start}:00+09:00`).getTime();
  const e = new Date(`${endDate}T${end}:00+09:00`).getTime();
  return e > s ? { start: s, end: e } : null;
}

export function EventForm({ venues, days, members, selfId, defaults, onSuccess, existing = [] }: Props) {
  // 招待: デフォルトは「個別に招待」。solo = 自分だけの予定(お風呂の単独利用など)
  const [inviteMode, setInviteMode] = useState<"members" | "all" | "solo">("members");
  const [invitees, setInvitees] = useState<Set<string>>(() => new Set());
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState("red");
  const [icon, setIcon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false); // 下書きを復元したことの表示
  const [overlaps, setOverlaps] = useState<ExistingEvent[]>([]); // 同じ会場・時間帯に重なる既存イベント
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  // 会場・日時の入力から重複を計算する(入力のたびに更新し、送信前にも確認する)
  const computeOverlaps = (): ExistingEvent[] => {
    const form = formRef.current;
    if (!form || existing.length === 0) return [];
    const venueId = (form.elements.namedItem("venueId") as HTMLSelectElement | null)?.value ?? "";
    const range = rangeFromForm(form, allDay);
    if (!venueId || !range) return [];
    return existing.filter(
      (e) => e.venueId === venueId && e.startMs < range.end && e.endMs > range.start,
    );
  };
  useEffect(() => {
    setOverlaps(computeOverlaps());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDay, existing]);

  // マウント時: 24時間以内の下書きがあれば復元する(予定表からのプリセットがある場合は日時・会場は
  // プリセットを優先し、タイトル・説明などのテキストだけ復元)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Draft;
      if (!d.at || Date.now() - d.at > DRAFT_TTL) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      const hasText = Object.values(d.fields ?? {}).some((v) => v && v.trim());
      if (!hasText) return;
      setInviteMode(d.inviteMode ?? "members");
      setInvitees(new Set(d.invitees ?? []));
      setAllDay(!!d.allDay);
      setColor(d.color ?? "red");
      setIcon(d.icon ?? null);
      const skip = new Set(defaults ? ["venueId", "date", "endDate", "start", "end"] : []);
      // state 反映後に uncontrolled な入力へ値を戻す
      requestAnimationFrame(() => {
        const form = formRef.current;
        if (!form) return;
        for (const [name, value] of Object.entries(d.fields ?? {})) {
          if (skip.has(name)) continue;
          const el = form.elements.namedItem(name);
          if (el && "value" in el && !(el instanceof RadioNodeList)) {
            (el as HTMLInputElement).value = value;
          }
        }
      });
      setRestored(true);
    } catch {
      /* 壊れた下書きは無視 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 入力のたびに下書きを保存する(state 系は変化時に別途保存)
  const saveDraft = () => {
    const form = formRef.current;
    if (!form) return;
    try {
      const fields: Record<string, string> = {};
      for (const name of ["title", "venueId", "date", "endDate", "start", "end", "description", "budgetAmount", "budgetPer"]) {
        const el = form.elements.namedItem(name);
        if (el && "value" in el && !(el instanceof RadioNodeList)) fields[name] = (el as HTMLInputElement).value;
      }
      const d: Draft = { at: Date.now(), fields, inviteMode, invitees: [...invitees], allDay, color, icon };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* noop */
    }
  };
  useEffect(() => {
    if (formRef.current && (formRef.current.elements.namedItem("title") as HTMLInputElement | null)?.value) saveDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteMode, invitees, allDay, color, icon]);
  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* noop */
    }
  };

  const toggleInvitee = (id: string) => {
    setInvitees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <form
      ref={formRef}
      onInput={() => {
        saveDraft();
        setOverlaps(computeOverlaps());
      }}
      onChange={() => {
        saveDraft();
        setOverlaps(computeOverlaps());
      }}
      action={async (formData) => {
        if (submitting.current) return;
        // 送信前のバリデーション(原因がわかるメッセージを表示)
        if (inviteMode === "members" && invitees.size === 0) {
          setError(
            "招待するメンバーを選択してください(ひとりで使う場合は「自分のみ」を選べます)",
          );
          return;
        }
        // 同じ会場・時間帯に既存のイベントがあれば、保存前に確認する
        const hits = computeOverlaps();
        if (hits.length > 0) {
          const names = hits.slice(0, 3).map((h) => `「${h.title}」`).join("、");
          const more = hits.length > 3 ? ` ほか${hits.length - 3}件` : "";
          const ok = window.confirm(
            `同じ会場・時間帯に ${names}${more} が予約されています。\n重ねて登録しますか?`,
          );
          if (!ok) return;
        }
        submitting.current = true;
        setError(null);
        try {
          const res = await createEvent(formData);
          if (res?.error) {
            setError(res.error);
            submitting.current = false;
          } else {
            clearDraft();
            toast.show("イベントを作成しました");
            onSuccess?.();
          }
        } catch {
          setError("作成に失敗しました。時間をおいて再度お試しください。");
          submitting.current = false;
        }
      }}
    >
      {restored && (
        <div className="mb-1 flex items-center justify-between gap-2 rounded-lg bg-primary-soft px-2.5 py-1.5 text-[11.5px] font-bold text-primary">
          <span>入力途中の内容を復元しました</span>
          <button
            type="button"
            onClick={() => {
              clearDraft();
              formRef.current?.reset();
              setInviteMode("members");
              setInvitees(new Set());
              setAllDay(false);
              setColor("red");
              setIcon(null);
              setRestored(false);
            }}
            className="shrink-0 underline"
          >
            白紙にする
          </button>
        </div>
      )}
      <label className={labelCls} htmlFor="title">イベント名</label>
      <input className={inputCls} id="title" name="title" required placeholder="花火大会" />

      <label className={labelCls} htmlFor="venueId">会場</label>
      <select className={inputCls} id="venueId" name="venueId" required defaultValue={defaults?.venueId}>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>

      <label className="mt-3 flex items-center gap-2.5 text-[13px] font-semibold">
        <input
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="h-5 w-5 accent-primary"
        />
        終日(期間で会場を確保)
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls} htmlFor="date">開始日</label>
          <select className={inputCls} id="date" name="date" required defaultValue={defaults?.date}>
            {days.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </div>
        {!allDay && (
          <div>
            <label className={labelCls} htmlFor="start">開始時刻</label>
            <input className={inputCls} id="start" name="start" type="time" required defaultValue={defaults?.start ?? "19:30"} />
          </div>
        )}
        <div>
          <label className={labelCls} htmlFor="endDate">終了日</label>
          <select className={inputCls} id="endDate" name="endDate" required defaultValue={defaults?.date}>
            {days.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </div>
        {!allDay && (
          <div>
            <label className={labelCls} htmlFor="end">終了時刻</label>
            <input className={inputCls} id="end" name="end" type="time" required defaultValue={defaults?.end ?? "20:30"} />
          </div>
        )}
      </div>
      <p className="mx-0.5 mt-1 text-[11px] text-muted">
        {allDay
          ? "開始日〜終了日の期間、この会場を終日押さえます。"
          : "終了日を翌日以降にすると、日をまたぐ予定を作成できます。"}
      </p>
      {overlaps.length > 0 && (
        <div className="mt-2 rounded-[10px] border-2 border-pend bg-pend-soft px-3 py-2 text-[12px] text-pend">
          <span className="font-bold">この会場・時間帯には既に予定があります:</span>{" "}
          {overlaps.slice(0, 3).map((h) => `「${h.title}」`).join("、")}
          {overlaps.length > 3 && ` ほか${overlaps.length - 3}件`}
          <span className="block text-[11px]">重ねて登録することもできます(保存時に確認します)。</span>
        </div>
      )}

      <label className={labelCls} htmlFor="description">説明(任意)</label>
      <input className={inputCls} id="description" name="description" placeholder="持ち物や集合場所など" />

      {/* 予算の目安(任意): 金額+単位(1人あたり/全体) */}
      <label className={labelCls} htmlFor="budgetAmount">予算の目安(任意)</label>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[13px] text-muted">¥</span>
        <input
          className={inputCls}
          id="budgetAmount"
          name="budgetAmount"
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          placeholder="3000"
        />
        <select
          className="shrink-0 rounded-[10px] border-2 border-line bg-white px-2 py-2.5 text-sm"
          name="budgetPer"
          defaultValue="person"
          aria-label="予算の単位"
        >
          <option value="person">1人あたり</option>
          <option value="total">全体</option>
        </select>
      </div>
      <p className="mx-0.5 mt-1 text-[11px] text-muted">
        参加者が「いくらくらいかかるか」を判断する目安です。費用の登録とは連動しません。
      </p>

      {/* 予定表での見た目: カラー+アイコン */}
      <label className={labelCls}>カレンダーのカラー</label>
      <input type="hidden" name="color" value={color} />
      <div className="flex gap-2.5">
        {EVENT_COLORS.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-label={c.label}
            onClick={() => setColor(c.key)}
            className={`h-9 w-9 rounded-full border-2 border-line ${eventSwatchClass(c.key)} ${
              color === c.key
                ? "shadow-[2px_2px_0_var(--color-line)] ring-2 ring-ink ring-offset-2 ring-offset-screen"
                : "opacity-70"
            }`}
          />
        ))}
      </div>

      <label className={labelCls}>カレンダーのアイコン(任意)</label>
      <input type="hidden" name="icon" value={icon ?? ""} />
      <div className="grid grid-cols-6 gap-1.5">
        <button
          type="button"
          onClick={() => setIcon(null)}
          className={`flex aspect-square items-center justify-center rounded-lg border-2 text-[10px] font-bold ${
            icon === null ? "border-line bg-ink text-screen" : "border-line bg-white text-muted"
          }`}
        >
          なし
        </button>
        {EVENT_ICON_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            aria-label={EVENT_ICON_LABELS[k] ?? k}
            onClick={() => setIcon(k)}
            className={`flex aspect-square items-center justify-center rounded-lg border-2 ${
              icon === k ? "border-line bg-ink text-screen" : "border-line bg-white text-ink"
            }`}
          >
            <EventIcon icon={k} className="h-5 w-5" />
          </button>
        ))}
      </div>

      {/* 招待(費用の「選び方」と同じセグメントUI。デフォルトは個別に招待) */}
      <label className={labelCls}>招待するメンバー</label>
      <div className="grid grid-cols-3 gap-1 rounded-[10px] border-2 border-line bg-white p-1">
        <button
          type="button"
          onClick={() => setInviteMode("members")}
          className={`rounded-lg py-2 text-center text-[12.5px] font-bold ${
            inviteMode === "members" ? "bg-ink text-screen" : "text-muted"
          }`}
        >
          個別に招待
        </button>
        <button
          type="button"
          onClick={() => setInviteMode("all")}
          className={`rounded-lg py-2 text-center text-[12.5px] font-bold ${
            inviteMode === "all" ? "bg-ink text-screen" : "text-muted"
          }`}
        >
          全員を招待
        </button>
        <button
          type="button"
          onClick={() => setInviteMode("solo")}
          className={`rounded-lg py-2 text-center text-[12.5px] font-bold ${
            inviteMode === "solo" ? "bg-ink text-screen" : "text-muted"
          }`}
        >
          自分のみ
        </button>
      </div>
      <p className="mx-0.5 mt-1.5 text-[11px] text-muted">
        {inviteMode === "all"
          ? "承認済みメンバー全員に招待のお知らせ+通知が届きます。"
          : inviteMode === "solo"
            ? "誰も招待せず、自分だけの予定として登録します(お風呂の単独利用など。あとから招待もできます)。"
            : "選んだメンバーにだけ招待が届きます(あとから参加者の追加もできます)。"}
      </p>
      {inviteMode === "all" && <input type="hidden" name="inviteAll" value="on" />}

      {inviteMode === "members" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {members
            .filter((m) => m.userId !== selfId)
            .map((m) => {
              const checked = invitees.has(m.userId);
              return (
                <label
                  key={m.userId}
                  className={`flex items-center gap-1.5 rounded-full border-2 border-line px-3 py-1.5 text-[12.5px] font-bold ${
                    checked ? "bg-primary text-white" : "bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={m.userId}
                    checked={checked}
                    onChange={() => toggleInvitee(m.userId)}
                    className="sr-only"
                  />
                  {m.name}
                </label>
              );
            })}
        </div>
      )}

      <p className="mx-0.5 mt-3.5 text-[11.5px] text-muted">
        同じ会場・時間帯に複数のイベントを重ねて登録できます。
        参加者には開始前に自動でリマインド通知が届きます(各自オフ可)。
        入力途中の内容はこの端末に自動保存され、閉じてしまっても次に開いたときに復元されます。
      </p>

      <FormError message={error} />

      <SubmitButton className={`${btnCls} mt-3 w-full py-3.5`}>
        会場を予約してイベントを作成
      </SubmitButton>
    </form>
  );
}
