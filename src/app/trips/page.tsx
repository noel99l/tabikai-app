import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { IconPlus, IconSuitcase } from "@/components/icons";
import { Pill } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { selectTrip } from "@/lib/actions/trips";
import { fmtDateLabel } from "@/lib/format";
import { requireUser } from "@/lib/session";

export default async function TripsPage() {
  const user = await requireUser();
  const db = await getDb();
  const memberships = await db
    .select({
      tripId: schema.tripMembers.tripId,
      status: schema.tripMembers.status,
      role: schema.tripMembers.role,
      name: schema.trips.name,
      startsAt: schema.trips.startsAt,
      endsAt: schema.trips.endsAt,
    })
    .from(schema.tripMembers)
    .innerJoin(schema.trips, eq(schema.trips.id, schema.tripMembers.tripId))
    .where(eq(schema.tripMembers.userId, user.id));

  const now = new Date();

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4">
      <div className="pt-10 pb-4 text-center">
        <h1 className="text-xl font-bold">イベントを選択</h1>
        <p className="mt-1 text-[12.5px] text-muted">
          {user.email} で参加中のイベント(企画)
        </p>
      </div>

      {memberships.length === 0 && (
        <p className="mb-3 rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-muted">
          参加中のイベントはまだありません。招待リンクから参加するか、新しく作成してください。
        </p>
      )}

      {memberships.map((m) => {
        const ended = m.endsAt < now;
        return (
          <div key={m.tripId} className="relative mb-2.5">
          <form action={selectTrip.bind(null, m.tripId)}>
            <SubmitButton
              spinner={false}
              className={`flex w-full items-center gap-3 rounded-xl border border-line bg-white p-3.5 text-left ${ended ? "opacity-60" : ""}`}
            >
              <span
                className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] ${ended ? "bg-line" : "bg-primary-soft"}`}
              >
                <IconSuitcase
                  className={`h-7 w-7 ${ended ? "text-muted" : "text-primary"}`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold">{m.name}</span>
                <span className="block text-[11.5px] text-muted">
                  {fmtDateLabel(m.startsAt)} – {fmtDateLabel(m.endsAt)}
                </span>
              </span>
              {m.status === "pending" ? (
                <Pill tone="pend">承認待ち</Pill>
              ) : m.status === "rejected" ? (
                <Pill tone="pend">参加不可</Pill>
              ) : ended ? (
                <Pill tone="ok">終了</Pill>
              ) : (
                <Pill tone="info">開催予定</Pill>
              )}
            </SubmitButton>
          </form>
          {m.role === "admin" && (
            <div className="mt-1 text-right">
              <Link
                href={`/trips/${m.tripId}/delete`}
                className="text-[11px] font-bold text-accent"
              >
                この企画を削除…
              </Link>
            </div>
          )}
          </div>
        );
      })}

      <Link
        href="/trips/new"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line p-3.5 text-[13.5px] font-bold text-primary"
      >
        <IconPlus className="h-4 w-4" />
        新しいイベントを作成
      </Link>

      <form
        action={async () => {
          "use server";
          const { signOut } = await import("@/auth");
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-6 pb-10 text-center"
      >
        <SubmitButton spinner={false} className="text-[12.5px] font-bold text-muted underline">
          ログアウト
        </SubmitButton>
      </form>
    </div>
  );
}
