// 領収書画像を端末側で縮小・再圧縮する(DB容量を抑えるため、サーバーへは圧縮後のみ送る)。
// 長辺を上限まで縮小し、JPEG品質を段階的に落として目標サイズ以下に収める。

export const RECEIPT_MAX_EDGE = 1600;
export const RECEIPT_TARGET_BYTES = 450 * 1024;
// サーバー側で受け付ける上限(圧縮に失敗しても極端なサイズは弾く)
export const RECEIPT_HARD_LIMIT_BYTES = 1500 * 1024;
// 1つの費用に添付できる領収書の上限枚数と、1回の送信で追加できる枚数
// (サーバーアクションの本文サイズ上限に収めるため。1枚あたり数百KBの base64)
export const RECEIPT_MAX_PER_EXPENSE = 6;
export const RECEIPT_MAX_PER_SUBMIT = 4;

export type CompressedReceipt = {
  blob: Blob;
  width: number;
  height: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした"));
    };
    img.src = url;
  });
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("画像の変換に失敗しました"))),
      "image/jpeg",
      quality,
    );
  });
}

export async function compressReceipt(file: File): Promise<CompressedReceipt> {
  const img = await loadImage(file);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  if (!srcW || !srcH) throw new Error("画像を読み込めませんでした");

  let scale = Math.min(1, RECEIPT_MAX_EDGE / Math.max(srcW, srcH));
  let best: CompressedReceipt | null = null;
  // 品質を落としても収まらなければ解像度を下げてやり直す(下限800px)
  for (;;) {
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像の変換に失敗しました");
    // 透過PNGの背景は白で埋める(JPEG化で黒くならないように)
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of [0.82, 0.72, 0.62, 0.52]) {
      const blob = await toJpeg(canvas, q);
      if (!best || blob.size < best.blob.size) best = { blob, width: w, height: h };
      if (blob.size <= RECEIPT_TARGET_BYTES) return { blob, width: w, height: h };
    }
    if (Math.max(w, h) <= 800) break;
    scale *= 0.75;
  }
  return best!;
}

// フォームで送るためのbase64(データURL接頭辞なし)
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result ?? "");
      resolve(s.slice(s.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("画像の変換に失敗しました"));
    reader.readAsDataURL(blob);
  });
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}
