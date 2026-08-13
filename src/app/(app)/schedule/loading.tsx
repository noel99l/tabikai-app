import { SkeletonBox, SkeletonHeader } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <div className="mb-2.5 flex gap-1.5">
        <SkeletonBox className="h-9 flex-1" />
        <SkeletonBox className="h-9 flex-1" />
      </div>
      <SkeletonBox className="h-[360px] w-full" />
    </>
  );
}
