import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// 費用ページの形(サマリー2枚+費用行+精算)に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <div className="mb-3 grid grid-cols-2 gap-2">
        <SkeletonFrame className="p-3">
          <SkeletonBox className="mb-2 h-3 w-16" />
          <SkeletonBox className="h-6 w-24" />
        </SkeletonFrame>
        <SkeletonFrame className="p-3">
          <SkeletonBox className="mb-2 h-3 w-20" />
          <SkeletonBox className="h-6 w-24" />
        </SkeletonFrame>
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <SkeletonFrame key={i} className="mb-2.5 flex items-center justify-between gap-3 p-3.5">
          <div className="flex-1">
            <SkeletonBox className="mb-1.5 h-4 w-2/3" />
            <SkeletonBox className="h-3 w-1/2" />
          </div>
          <SkeletonBox className="h-6 w-20" />
        </SkeletonFrame>
      ))}
      <SkeletonBox className="mx-0.5 mt-4 mb-2 h-3.5 w-10" />
      <SkeletonFrame className="p-3.5">
        <SkeletonBox className="mb-2 h-4 w-1/3" />
        <SkeletonBox className="h-3 w-2/3" />
      </SkeletonFrame>
    </>
  );
}
