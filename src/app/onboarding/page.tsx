import { redirect } from "next/navigation";
import { IconSuitcase } from "@/components/icons";
import { ProfileForm } from "@/components/profile-form";
import { completeOnboarding } from "@/lib/actions/profile";
import { getSessionUser, safeNext } from "@/lib/session";

// Googleログイン直後の初回設定。表示名とアイコンを決める。
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next, "/trips");
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.onboardedAt) redirect(next);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 pb-16">
      <div className="mb-6 text-center">
        <IconSuitcase className="mx-auto h-12 w-12 text-primary" strokeWidth={1.6} />
        <h1 className="mt-2.5 text-[22px] font-bold">ようこそ!</h1>
        <p className="text-[13px] text-muted">
          みんなに表示される名前とアイコンを設定してください
        </p>
      </div>
      <ProfileForm
        action={completeOnboarding.bind(null, next)}
        defaultName={user.name}
        defaultEmoji={user.avatarEmoji}
        submitLabel="はじめる"
      />
    </div>
  );
}
