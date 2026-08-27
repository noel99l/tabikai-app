import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// 買い出しリストの形(タブ+バナー+カード)に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <SkeletonBox className="mx-0.5 mb-2.5 h-3.5 w-4/5" />
      <SkeletonFrame className="grid grid-cols-3 gap-1 p-1">
        <SkeletonBox className="h-9 rounded-lg" />
        <div />
        <div />
      </SkeletonFrame>
      <SkeletonFrame className="mt-2.5 mb-3.5 h-[46px]" />
      {Array.from({ length: 3 }, (_, i) => (
        <SkeletonFrame key={i} className="mb-2.5 p-3">
          <div className="flex items-start gap-2.5">
            <SkeletonBox className="mt-1 h-5 w-3" />
            <div className="flex-1">
              <SkeletonBox className="mb-1.5 h-4 w-1/2" />
              <SkeletonBox className="h-3 w-1/3" />
            </div>
          </div>
          <div className="mt-2.5 flex gap-2">
            <SkeletonBox className="h-9 flex-1 rounded-[10px]" />
            <SkeletonBox className="h-9 flex-1 rounded-[10px]" />
          </div>
        </SkeletonFrame>
      ))}
    </>
  );
}
