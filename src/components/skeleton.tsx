// ページ遷移中に表示するスケルトン部品(Suspense の fallback / loading.tsx 用)
// 実画面と同じ「黒枠+ハードシャドウ」の器の中で、中身だけをパルス表示する

export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-ink/10 ${className}`} />;
}

// 実画面の Card と同じ器(黒2px枠+ハードシャドウ)
export function SkeletonFrame({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[14px] border-2 border-line bg-white shadow-[3px_3px_0_var(--color-line)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="flex items-center justify-between px-1 pt-3 pb-2.5">
      <SkeletonBox className="h-6 w-28" />
      <div className="flex items-center gap-3">
        <SkeletonBox className="h-6 w-6 rounded-full" />
        <SkeletonBox className="h-[30px] w-[30px] rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <SkeletonFrame className="mb-2.5 p-3.5">
      <SkeletonBox className="mb-2 h-4 w-1/2" />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBox key={i} className="mt-1.5 h-3 w-full" />
      ))}
    </SkeletonFrame>
  );
}

// 見出し+カード数枚の汎用リストスケルトン
export function SkeletonList({ cards = 3 }: { cards?: number }) {
  return (
    <>
      <SkeletonHeader />
      {Array.from({ length: cards }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
