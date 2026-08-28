import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// イベント(リスト)の形に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      {/* ビュー切替セグメント */}
      <SkeletonFrame className="mb-3 flex gap-1.5 p-1">
        <SkeletonBox className="h-9 flex-1 rounded-[9px]" />
        <SkeletonBox className="h-9 flex-1 rounded-[9px]" />
      </SkeletonFrame>
      {/* 日付タブ */}
      <div className="mb-3 flex gap-2">
        <SkeletonBox className="h-10 flex-1 rounded-xl" />
        <SkeletonBox className="h-10 flex-1 rounded-xl" />
      </div>
      {/* アジェンダ行 */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="mb-2.5 flex gap-2.5">
          <div className="w-11 shrink-0 pt-2">
            <SkeletonBox className="ml-auto h-3.5 w-9" />
            <SkeletonBox className="mt-1 ml-auto h-3 w-7" />
          </div>
          <SkeletonFrame className="flex flex-1 items-center gap-2.5 p-2.5">
            <SkeletonBox className="h-8 w-8 rounded-[10px]" />
            <div className="flex-1">
              <SkeletonBox className="mb-1.5 h-3.5 w-2/3" />
              <SkeletonBox className="h-3 w-1/2" />
            </div>
            <SkeletonBox className="h-5 w-10 rounded-full" />
          </SkeletonFrame>
        </div>
      ))}
    </>
  );
}
