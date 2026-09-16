// 買物 / 備品のカテゴリ(クライアント・サーバー共用)
export const ITEM_CATEGORIES = [
  { key: "food", label: "食材" },
  { key: "cookware", label: "調理器具" },
  { key: "play", label: "遊び道具" },
  { key: "consumable", label: "消耗品" },
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number]["key"];

export const ITEM_CATEGORY_KEYS = ITEM_CATEGORIES.map((c) => c.key) as ItemCategory[];

export function isItemCategory(v: unknown): v is ItemCategory {
  return typeof v === "string" && (ITEM_CATEGORY_KEYS as string[]).includes(v);
}

export function itemCategoryLabel(key: ItemCategory): string {
  return ITEM_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
