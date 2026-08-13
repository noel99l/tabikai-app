"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb, schema } from "@/db";

// 絵文字1文字ぶんに丸める(サロゲートペア対応)
function firstEmoji(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  return [...t][0] ?? null;
}

// 初回オンボーディング: 表示名+アイコンを設定して完了フラグを立てる
export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  const emoji = firstEmoji(String(formData.get("avatarEmoji") ?? ""));
  if (!name) return { error: "表示名を入力してください" };
  const db = await getDb();
  await db
    .update(schema.users)
    .set({ name, avatarEmoji: emoji, onboardedAt: new Date() })
    .where(eq(schema.users.id, session.user.id));
  redirect("/trips");
}

// 設定画面からのプロフィール編集(表示名+アイコン)
export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  const emoji = firstEmoji(String(formData.get("avatarEmoji") ?? ""));
  if (!name) return { error: "表示名を入力してください" };
  const db = await getDb();
  await db
    .update(schema.users)
    .set({ name, avatarEmoji: emoji })
    .where(eq(schema.users.id, session.user.id));
  revalidatePath("/", "layout");
  revalidatePath("/settings");
}
