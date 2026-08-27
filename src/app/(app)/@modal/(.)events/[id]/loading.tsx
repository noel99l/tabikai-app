import { SkeletonBox, SkeletonFrame } from "@/components/skeleton";

// モーダルの中身を読み込む間も、先にモーダル自体を飛び出させて表示する
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[25] flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-[backdrop-in_200ms_ease-out] absolute inset-0 bg-ink/40" />
      <div className="animate-[pop-in_360ms_cubic-bezier(0.34,1.56,0.64,1)] relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t-[3px] border-line bg-screen px-4 pt-3 pb-10 sm:max-h-[85dvh] sm:rounded-2xl sm:border-[3px] sm:pb-6">
        <SkeletonBox className="mb-3 h-5 w-28" />
        <div className="mb-3.5 border-l-4 border-l-ink/10 pl-3">
          <SkeletonBox className="mb-1.5 h-6 w-1/2" />
          <SkeletonBox className="h-3.5 w-2/3" />
        </div>
        <SkeletonFrame className="p-3.5">
          <SkeletonBox className="mb-2.5 h-3.5 w-full" />
          <SkeletonBox className="mb-2.5 h-3.5 w-full" />
          <SkeletonBox className="h-3.5 w-2/3" />
        </SkeletonFrame>
        <SkeletonFrame className="mt-2.5 p-3.5">
          <SkeletonBox className="mb-2.5 h-4 w-28" />
          <div className="flex gap-1">
            <SkeletonBox className="h-7 w-7 rounded-full" />
            <SkeletonBox className="h-7 w-7 rounded-full" />
            <SkeletonBox className="h-7 w-7 rounded-full" />
          </div>
        </SkeletonFrame>
        <SkeletonBox className="mt-3 h-[50px] w-full rounded-[12px]" />
      </div>
    </div>
  );
}
