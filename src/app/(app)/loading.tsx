import { SkeletonList } from "@/components/skeleton";

// 下部タブ配下の全ページ共通の遷移中スケルトン
export default function Loading() {
  return <SkeletonList cards={4} />;
}
