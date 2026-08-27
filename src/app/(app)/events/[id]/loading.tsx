import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// イベント詳細の形(タイトル+詳細+参加者+参加ボタン)に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <SkeletonBox className="mb-2 h-4 w-24" />
      <div className="mt-1 mb-3.5 border-l-4 border-l-ink/10 pl-3">
        <SkeletonBox className="mb-1.5 h-6 w-1/2" />
        <SkeletonBox className="h-3.5 w-2/3" />
      </div>
      <SkeletonFrame className="p-3.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex justify-between py-2.5">
            <SkeletonBox className="h-3.5 w-16" />
            <SkeletonBox className="h-3.5 w-24" />
          </div>
        ))}
      </SkeletonFrame>
      <SkeletonFrame className="mt-2.5 p-3.5">
        <SkeletonBox className="mb-2.5 h-4 w-28" />
        <div className="flex gap-1">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonBox key={i} className="h-7 w-7 rounded-full" />
          ))}
        </div>
      </SkeletonFrame>
      <SkeletonBox className="mt-3 h-[50px] w-full rounded-[12px]" />
    </>
  );
}
