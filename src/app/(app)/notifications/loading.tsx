import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// お知らせ一覧の形(行リスト)に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonFrame key={i} className="mb-2 flex items-start gap-2.5 p-3">
          <SkeletonBox className="h-9 w-9 rounded-[10px]" />
          <div className="flex-1">
            <SkeletonBox className="mb-1.5 h-4 w-3/4" />
            <SkeletonBox className="h-3 w-1/2" />
          </div>
        </SkeletonFrame>
      ))}
    </>
  );
}
