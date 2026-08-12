import Link from "next/link";
import { IconClock } from "@/components/icons";
import { requireUser } from "@/lib/session";

export default async function PendingPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pend-soft">
        <IconClock className="h-8 w-8 text-pend" />
      </span>
      <h1 className="mt-4 text-lg font-bold">管理者の参加承認待ちです</h1>
      <p className="mt-2 text-[13px] text-muted">
        {user.email} でリクエスト済み。承認されるとアプリを利用できます。
        承認後にこのページを再読み込みしてください。
      </p>
      <Link href="/trips" className="mt-6 text-[13px] font-bold text-primary">
        イベント選択へ戻る
      </Link>
    </div>
  );
}
