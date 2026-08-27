import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// 設定ページの形(プロフィール+通知設定+ログアウト)に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <SkeletonFrame className="p-3.5">
        <div className="mb-3 flex flex-col items-center gap-2">
          <SkeletonBox className="h-[72px] w-[72px] rounded-full" />
        </div>
        <SkeletonBox className="mb-2 h-11 w-full rounded-[10px]" />
        <SkeletonBox className="h-24 w-full rounded-[10px]" />
      </SkeletonFrame>
      <SkeletonFrame className="mt-2.5 p-3.5">
        <SkeletonBox className="mb-1.5 h-4 w-1/3" />
        <SkeletonBox className="h-3 w-2/3" />
      </SkeletonFrame>
      <SkeletonBox className="mt-3 h-12 w-full rounded-[12px]" />
    </>
  );
}
