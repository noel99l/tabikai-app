import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  IconBell,
  IconCalendar,
  IconCart,
  IconHome,
  IconMoney,
  IconUsers,
} from "@/components/icons";

// ドメイン直下のサービス紹介LP。ログイン済みならホーム(/home)へ。
export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  const features = [
    {
      icon: IconCalendar,
      title: "予定表",
      desc: "会場ごとのタイムラインで旅程がひと目でわかる。空き枠から予約、ドラッグで時間変更も。",
    },
    {
      icon: IconMoney,
      title: "割り勘・精算",
      desc: "立て替えの登録から各メンバーの承認、最後の精算までまとめて管理。",
    },
    {
      icon: IconCart,
      title: "買い出しリスト",
      desc: "「持ってくる」「買ってくる」をみんなで共有。優先度も並び替えで整理。",
    },
    {
      icon: IconBell,
      title: "リマインド通知",
      desc: "イベント開始前にプッシュ通知でお知らせ。全体アナウンスもワンタップ。",
    },
    {
      icon: IconUsers,
      title: "招待リンク",
      desc: "リンクを送るだけでメンバーを招待。承認制と自動承認を選べます。",
    },
    {
      icon: IconHome,
      title: "ホーム画面に追加",
      desc: "PWA対応。インストール不要で、アプリのようにホーム画面から起動できます。",
    },
  ];

  const steps = [
    { n: "1", title: "ログイン", desc: "Googleアカウントでログインするだけ。登録作業はありません。" },
    { n: "2", title: "企画に参加", desc: "招待リンクから参加、または自分で旅の企画を作成します。" },
    { n: "3", title: "まとめて管理", desc: "予定・買い出し・費用をメンバー全員で共有して準備完了。" },
  ];

  const ctaCls =
    "inline-block rounded-[14px] border-2 border-line bg-primary px-8 py-3.5 text-[15px] font-bold text-white shadow-[3px_3px_0_var(--color-line)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-5 pb-16">
      {/* ヒーロー */}
      <header className="flex flex-col items-center pt-14 text-center">
        <Image
          src="/icon-192.png"
          alt=""
          width={96}
          height={96}
          priority
          className="rounded-[24px] border-[3px] border-line shadow-[4px_4px_0_var(--color-line)]"
        />
        <h1 className="mt-5 text-[28px] leading-tight">突然の旅会アプリ</h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted">
          突然はじまる友達との旅行を、企画から精算までこれひとつで。
          <br />
          予定表・買い出しリスト・割り勘を、メンバーみんなで共有できます。
        </p>
        <Link href="/login" className={`${ctaCls} mt-6`}>
          ログインしてはじめる
        </Link>
        <p className="mt-2.5 text-[11.5px] text-muted">
          メンバーへの参加は、管理者からの招待リンクをご利用ください
        </p>
      </header>

      {/* 機能紹介 */}
      <section className="mt-14">
        <h2 className="mb-4 text-center text-[20px]">できること</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border-2 border-line bg-white p-4 shadow-[3px_3px_0_var(--color-line)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-line bg-primary-soft">
                  <f.icon className="h-5 w-5 text-primary" />
                </span>
                <span className="text-[15px] font-extrabold">{f.title}</span>
              </div>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 使い方 */}
      <section className="mt-14">
        <h2 className="mb-4 text-center text-[20px]">はじめかた</h2>
        <div className="flex flex-col gap-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="flex items-center gap-3.5 rounded-2xl border-2 border-line bg-white p-4 shadow-[3px_3px_0_var(--color-line)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-line bg-ink text-[15px] font-extrabold text-screen">
                {s.n}
              </span>
              <div>
                <div className="text-[14px] font-extrabold">{s.title}</div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 締めのCTA */}
      <section className="mt-14 flex flex-col items-center rounded-2xl border-2 border-line bg-white p-7 text-center shadow-[3px_3px_0_var(--color-line)]">
        <h2 className="text-[18px]">さっそく旅の準備をはじめよう</h2>
        <Link href="/login" className={`${ctaCls} mt-4`}>
          ログインしてはじめる
        </Link>
      </section>

      <footer className="mt-10 text-center text-[11px] text-muted">
        突然の旅会アプリ — 仲間内の旅行企画・費用管理アプリ
      </footer>
    </div>
  );
}
