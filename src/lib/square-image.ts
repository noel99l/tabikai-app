// 画像を正方形に中央クロップし、指定サイズにリサイズして JPEG の data URL にする。
// 企画ロゴ・ユーザーアイコンで共用(端末側で縮小してから保存するため DB が肥大化しない)。
export async function resizeToSquareDataUrl(file: File, size = 128): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像の変換に失敗しました");
  // 透過PNGの背景は白で埋める(JPEG化で黒くならないように)
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
