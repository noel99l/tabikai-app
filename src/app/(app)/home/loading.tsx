import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// ホーム(ダッシュボード)の形に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      {/* イベントロゴ+企画名のヒーローカード */}
      <SkeletonFrame className="mb-3 flex flex-col items-center gap-3 p-5">
        <SkeletonBox className="h-[72px] w-[72px] rounded-[18px]" />
        <SkeletonBox className="h-6 w-44" />
        <SkeletonBox className="h-3.5 w-56" />
        <SkeletonBox className="h-9 w-36 rounded-full" />
      </SkeletonFrame>
      {/* 管理者コンソール行 */}
      <SkeletonFrame className="mb-3 flex items-center gap-3 p-3.5">
        <SkeletonBox className="h-10 w-10 rounded-[12px]" />
        <SkeletonBox className="h-4 flex-1" />
      </SkeletonFrame>
      {/* 次の予定 */}
      <SkeletonBox className="mx-0.5 mt-4 mb-2 h-3.5 w-20" />
      <SkeletonFrame className="mb-2.5 p-3.5">
        <div className="flex items-center gap-3">
          <SkeletonBox className="h-11 w-11 rounded-[12px]" />
          <div className="flex-1">
            <SkeletonBox className="mb-1.5 h-4 w-2/3" />
            <SkeletonBox className="h-3 w-full" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <SkeletonBox className="h-10 flex-1 rounded-full" />
          <SkeletonBox className="h-10 flex-1 rounded-full" />
        </div>
      </SkeletonFrame>
      <SkeletonFrame className="mb-2.5 p-3.5">
        <SkeletonBox className="mb-2 h-4 w-1/2" />
        <SkeletonBox className="h-3 w-3/4" />
      </SkeletonFrame>
    </>
  );
}
