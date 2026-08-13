import { IconSuitcase } from "./icons";

// 企画ロゴ。logoUrl があれば画像、なければ標準アイコン。
export function TripLogo({
  logoUrl,
  size = 72,
  radius = 20,
  muted = false,
}: {
  logoUrl: string | null;
  size?: number;
  radius?: number;
  muted?: boolean;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden border-2 ${
        muted ? "border-transparent bg-line" : "border-primary bg-primary-soft"
      }`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <IconSuitcase
          className={muted ? "text-muted" : "text-primary"}
          style={{ width: size * 0.5, height: size * 0.5 }}
          strokeWidth={1.7}
        />
      )}
    </span>
  );
}
