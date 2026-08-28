import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { IconSuitcase } from "@/components/icons";
import { Card } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const hasGoogle =
  !!(process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID) &&
  !!(process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET);

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 pb-20">
      <div className="mb-6 text-center">
        <IconSuitcase className="mx-auto h-12 w-12 text-primary" strokeWidth={1.6} />
        <h1 className="mt-2.5 text-[22px] font-bold">突然の旅会アプリ</h1>
        <p className="text-[13px] text-muted">招待メンバー専用アプリ</p>
      </div>

      {hasGoogle && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/home" });
          }}
          className="mb-4"
        >
          <SubmitButton className="flex w-full items-center justify-center gap-2.5 rounded-[14px] border-2 border-line bg-white px-4 py-3 text-[14.5px] font-bold shadow-[3px_3px_0_var(--color-line)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            <span className="text-[17px] font-extrabold text-[#4285F4]">G</span>
            Google でログイン
          </SubmitButton>
          <p className="mt-2 text-center text-[11.5px] text-muted">
            Googleアカウントで本人確認を行います
          </p>
        </form>
      )}
      {(process.env.NODE_ENV !== "production" ||
        process.env.ALLOW_DEV_LOGIN === "1") && (
        <Card>
          <h2 className="mb-1 text-sm font-bold">開発用ログイン</h2>
          <p className="mb-3 text-[11.5px] text-muted">
            開発環境専用の簡易ログインです(本番では表示されません)。
          </p>
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("dev", {
                name: formData.get("name"),
                email: formData.get("email"),
                redirectTo: "/home",
              });
            }}
            className="flex flex-col gap-2.5"
          >
            <input
              name="name"
              placeholder="名前(例: ゆうすけ)"
              className="rounded-[10px] border-2 border-line bg-white px-3 py-2.5 text-sm"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="メールアドレス"
              className="rounded-[10px] border-2 border-line bg-white px-3 py-2.5 text-sm"
            />
            <SubmitButton className="rounded-[10px] bg-primary px-4 py-3 text-[13.5px] font-bold text-white">
              ログイン
            </SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
