import { SkeletonBox, SkeletonFrame, SkeletonHeader } from "@/components/skeleton";

// 費用(承認セグメント)の形に合わせたスケルトン
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      {/* [一覧|承認] セグメント */}
      <SkeletonFrame className="mb-3 flex gap-1.5 p-1">
        <SkeletonBox className="h-9 flex-1 rounded-[9px]" />
        <SkeletonBox className="h-9 flex-1 rounded-[9px]" />
      </SkeletonFrame>
      <SkeletonBox className="mx-0.5 mb-2.5 h-3.5 w-4/5" />
      {/* 承認カード */}
      {[0, 1].map((i) => (
        <SkeletonFrame key={i} className="mb-2.5 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <SkeletonBox className="h-4 w-1/3" />
            <SkeletonBox className="h-6 w-16 rounded-full" />
          </div>
          <SkeletonBox className="mt-2 h-3 w-2/3" />
          <SkeletonBox className="mt-2.5 h-10 w-full rounded-[10px]" />
          <div className="mt-2.5 flex gap-2">
            <SkeletonBox className="h-11 flex-1 rounded-[10px]" />
            <SkeletonBox className="h-11 w-16 rounded-[10px]" />
          </div>
        </SkeletonFrame>
      ))}
      {/* 対応済み */}
      <SkeletonBox className="mx-0.5 mt-4 mb-2 h-3.5 w-16" />
      {[0, 1].map((i) => (
        <SkeletonFrame key={i} className="mb-2 flex items-center gap-3 p-3">
          <div className="flex-1">
            <SkeletonBox className="mb-1.5 h-4 w-1/3" />
            <SkeletonBox className="h-3 w-2/3" />
          </div>
          <SkeletonBox className="h-6 w-16 rounded-full" />
        </SkeletonFrame>
      ))}
    </>
  );
}
