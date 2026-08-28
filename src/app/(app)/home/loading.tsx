import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// ホーム(サマリー)の形に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      {/* つぎの予定ヒーロー */}
      <SkeletonFrame className="p-3.5">
        <SkeletonBox className="h-3 w-16" />
        <div className="mt-2 flex items-start gap-3">
          <SkeletonBox className="h-6 flex-1" />
          <SkeletonBox className="h-9 w-11" />
        </div>
        <SkeletonBox className="mt-2.5 h-3.5 w-3/4" />
        <SkeletonBox className="mt-3 h-10 w-full rounded-lg" />
      </SkeletonFrame>
      {/* やること */}
      <SkeletonBox className="mx-0.5 mt-4 mb-2 h-3.5 w-16" />
      {[0, 1, 2].map((i) => (
        <SkeletonFrame key={i} className="mb-2 flex items-center gap-3 p-2.5">
          <SkeletonBox className="h-9 w-9 rounded-[11px]" />
          <div className="flex-1">
            <SkeletonBox className="mb-1.5 h-3.5 w-2/3" />
            <SkeletonBox className="h-3 w-1/2" />
          </div>
          <SkeletonBox className="h-7 w-16 rounded-full" />
        </SkeletonFrame>
      ))}
      {/* この後の予定 */}
      <SkeletonBox className="mx-0.5 mt-4 mb-2 h-3.5 w-20" />
      <div className="flex gap-2.5 overflow-hidden pb-1.5">
        {[0, 1, 2].map((i) => (
          <SkeletonFrame key={i} className="w-[136px] shrink-0 p-2.5">
            <SkeletonBox className="h-8 w-8 rounded-[10px]" />
            <SkeletonBox className="mt-2 h-3.5 w-full" />
            <SkeletonBox className="mt-1.5 h-3 w-2/3" />
          </SkeletonFrame>
        ))}
      </div>
    </>
  );
}
