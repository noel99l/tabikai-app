import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// 管理者コンソールの形(企画カード+メニュー行)に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <SkeletonBox className="mb-2 h-4 w-28" />
      <SkeletonFrame className="mb-3 flex items-center gap-3 p-3.5">
        <SkeletonBox className="h-11 w-11 rounded-[13px]" />
        <SkeletonBox className="h-4 flex-1" />
      </SkeletonFrame>
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonFrame key={i} className="mb-2.5 flex items-center gap-3 p-3.5">
          <SkeletonBox className="h-10 w-10 rounded-[12px]" />
          <div className="flex-1">
            <SkeletonBox className="mb-1.5 h-4 w-1/3" />
            <SkeletonBox className="h-3 w-2/3" />
          </div>
        </SkeletonFrame>
      ))}
    </>
  );
}
