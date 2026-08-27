import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// 承認ページの形(説明+承認カード)に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <SkeletonBox className="mx-0.5 mb-2.5 h-3.5 w-4/5" />
      {Array.from({ length: 2 }, (_, i) => (
        <SkeletonFrame key={i} className="mb-2.5 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <SkeletonBox className="mb-1.5 h-4 w-1/2" />
              <SkeletonBox className="h-3 w-2/3" />
            </div>
            <SkeletonBox className="h-6 w-16 rounded-full" />
          </div>
          <SkeletonBox className="my-2.5 h-9 w-full" />
          <div className="flex gap-2">
            <SkeletonBox className="h-11 flex-1 rounded-[12px]" />
            <SkeletonBox className="h-11 w-16 rounded-[10px]" />
          </div>
        </SkeletonFrame>
      ))}
    </>
  );
}
