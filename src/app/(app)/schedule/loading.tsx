import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// 予定表の形(日付タブ+フィルタ行+グリッド)に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <div className="mb-2 flex gap-1.5 pt-1 pb-1.5">
        <SkeletonFrame className="h-[38px] flex-1" />
        <SkeletonFrame className="h-[38px] flex-1" />
      </div>
      <div className="mb-2 flex items-center justify-between">
        <SkeletonBox className="h-4 w-32" />
        <SkeletonBox className="h-8 w-24 rounded-full" />
      </div>
      <SkeletonFrame className="h-[62dvh] overflow-hidden p-0">
        {/* 会場ヘッダー行 */}
        <div className="flex gap-2 border-b-2 border-line p-2 pl-11">
          <SkeletonBox className="h-4 flex-1" />
          <SkeletonBox className="h-4 flex-1" />
          <SkeletonBox className="h-4 flex-1" />
        </div>
        {/* 時間ラベル+枠 */}
        <div className="flex flex-col gap-7 p-2">
          {Array.from({ length: 8 }, (_, i) => (
            <SkeletonBox key={i} className="h-3 w-8" />
          ))}
        </div>
      </SkeletonFrame>
    </>
  );
}
