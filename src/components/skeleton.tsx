// ページ遷移中に表示するスケルトン部品(Suspense の fallback / loading.tsx 用)

export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-line/70 ${className}`} />;
}

export function SkeletonHeader() {
  return (
    <div className="flex items-center justify-between px-1 pt-3 pb-2.5">
      <SkeletonBox className="h-6 w-28" />
      <div className="flex items-center gap-3">
        <SkeletonBox className="h-5 w-5 rounded-full" />
        <SkeletonBox className="h-[30px] w-[30px] rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="mb-2.5 rounded-xl border border-line bg-white p-3.5">
      <SkeletonBox className="mb-2 h-4 w-1/2" />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBox key={i} className="mt-1.5 h-3 w-full" />
      ))}
    </div>
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
