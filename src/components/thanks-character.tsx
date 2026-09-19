// ありがとうポイント付与の演出に登場するキャラクター(SVG)。
// 黒髪・青いシャツ・青いギターを背負い、こちら(手前)に向かって指を差すポーズ。
// public/thanks/character.png を置くと、そちらの画像で差し替わる(thanks-grant.tsx 側で切替)。
export function ThanksCharacter({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 300"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="#1b1b1b"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* ===== 背中のギター(体の後ろ) ===== */}
      <g>
        {/* ネック: 左下のボディから右上へ */}
        <path d="M96 196 L196 62" stroke="#8b5a2b" strokeWidth={12} />
        <path d="M96 196 L196 62" stroke="#1b1b1b" strokeWidth={16} opacity="0" />
        <path d="M100 194 L194 66" stroke="#c9944f" strokeWidth={2} />
        {/* ヘッド */}
        <path d="M190 68 L212 40 L228 46 L208 76 Z" fill="#1e6fe0" />
        <circle cx="212" cy="50" r="2.4" fill="#fff" stroke="none" />
        <circle cx="219" cy="56" r="2.4" fill="#fff" stroke="none" />
        <circle cx="205" cy="58" r="2.4" fill="#fff" stroke="none" />
        <circle cx="212" cy="64" r="2.4" fill="#fff" stroke="none" />
        {/* ボディ(ストラト風・左下に見える) */}
        <path
          d="M104 178c-16-8-34 0-44 14-8 10-10 24-4 34 4 8 4 16 2 24-2 12 6 22 20 24 12 2 22-4 28-14 4-6 12-10 20-10 10 0 16-8 14-18-2-8-8-14-10-22-2-12-10-24-26-32z"
          fill="#1e6fe0"
        />
        <path d="M70 226c10-4 22-2 30 4" stroke="#fff" strokeWidth={2.5} />
        <path d="M74 240c10-4 22-2 30 4" stroke="#fff" strokeWidth={2.5} />
        <ellipse cx="96" cy="222" rx="6" ry="3" fill="#fff" stroke="none" transform="rotate(-40 96 222)" />
      </g>

      {/* ===== 脚(白いパンツ・スニーカー) ===== */}
      <path d="M104 226l-10 50h24l6-42" fill="#f4f4f4" />
      <path d="M136 226l10 50h-24l-6-42" fill="#f4f4f4" />
      <path d="M92 276h28l2 10H88z" fill="#1b1b1b" />
      <path d="M122 276h28l4 10h-32z" fill="#1b1b1b" />

      {/* ===== 体(青いシャツ) ===== */}
      <path d="M96 156c-8 8-12 24-12 42 0 14 4 24 10 30h52c6-6 10-16 10-30 0-18-4-34-12-42l-16 6h-16z" fill="#1e6fe0" />
      <path d="M110 156l10 14 10-14" fill="#fff" />
      {/* 左腕(下ろしてストラップを持つ) */}
      <path d="M92 164c-12 12-18 28-16 44 0 6 4 10 10 10s9-4 9-10c0-12 4-24 12-34" fill="#1e6fe0" />
      <circle cx="86" cy="218" r="9" fill="#ffe0c2" />
      <rect x="78" y="204" width="16" height="9" rx="4" fill="#2d7ff9" />

      {/* ===== 頭 ===== */}
      <ellipse cx="128" cy="100" rx="54" ry="52" fill="#ffe0c2" />
      {/* 髪: ざっくり前髪で目にかかるくらい */}
      <path
        d="M74 104c-4-40 24-64 56-64 32 0 56 22 56 56 0 6-1 12-3 16-4-8-8-14-12-18l-6 14c-4-10-8-16-12-20l-8 16c-4-10-8-16-12-18l-10 16c-4-8-8-12-12-14l-10 14c-6-2-10-6-12-12-6 4-10 8-15 14z"
        fill="#1b1b1b"
      />
      <path d="M70 110c2-16 8-28 18-38" stroke="#1b1b1b" strokeWidth={5} />
      <path d="M186 106c-2-14-6-24-12-32" stroke="#1b1b1b" strokeWidth={5} />
      {/* 耳 */}
      <ellipse cx="76" cy="112" rx="6" ry="9" fill="#ffe0c2" />
      <ellipse cx="180" cy="112" rx="6" ry="9" fill="#ffe0c2" />
      {/* 目(青・大きめ) */}
      <ellipse cx="108" cy="110" rx="10" ry="13" fill="#fff" />
      <ellipse cx="150" cy="110" rx="10" ry="13" fill="#fff" />
      <ellipse cx="109" cy="112" rx="6.5" ry="9.5" fill="#2d7ff9" stroke="none" />
      <ellipse cx="151" cy="112" rx="6.5" ry="9.5" fill="#2d7ff9" stroke="none" />
      <ellipse cx="109" cy="114" rx="3" ry="5" fill="#1b1b1b" stroke="none" />
      <ellipse cx="151" cy="114" rx="3" ry="5" fill="#1b1b1b" stroke="none" />
      <circle cx="111" cy="106" r="2.5" fill="#fff" stroke="none" />
      <circle cx="153" cy="106" r="2.5" fill="#fff" stroke="none" />
      {/* 眉(自信ありげ) */}
      <path d="M96 92c6-4 14-4 20-1" />
      <path d="M142 91c6-3 14-3 20 1" />
      {/* ほっぺ */}
      <ellipse cx="94" cy="126" rx="6" ry="3.5" fill="#ffb3b3" stroke="none" opacity="0.85" />
      <ellipse cx="164" cy="126" rx="6" ry="3.5" fill="#ffb3b3" stroke="none" opacity="0.85" />
      {/* 口(にやっと笑って舌をちょっと出す) */}
      <path d="M116 134c6 8 22 8 30-2" />
      <path d="M126 138c1 5 5 7 9 5-1-3-2-4-3-6" fill="#ff7a8a" />

      {/* ===== 右腕: 手前へ指差し(遠近で手を大きく) ===== */}
      <g className="thanks-point-arm">
        {/* 上腕〜前腕(手前へ短く見える) */}
        <path d="M150 166c12 8 24 20 30 36" stroke="#1e6fe0" strokeWidth={24} />
        <path d="M150 166c12 8 24 20 30 36" stroke="#1e6fe0" strokeWidth={20} />
        {/* 袖口 */}
        <ellipse cx="180" cy="202" rx="16" ry="12" fill="#2d7ff9" />
        {/* 握った手(大きく) */}
        <circle cx="190" cy="222" r="26" fill="#ffe0c2" />
        <path d="M172 214c6-2 12-2 18 0" />
        <path d="M172 226c6-2 12-2 18 0" />
        <path d="M176 238c6-2 12-2 16 0" />
        {/* 親指 */}
        <path d="M168 210c-4-8 2-16 10-12" fill="#ffe0c2" />
        {/* 人差し指: こちらへ突き出す(先端を大きく) */}
        <path d="M204 206 L236 190" stroke="#ffe0c2" strokeWidth={18} />
        <path d="M204 206 L236 190" stroke="#1b1b1b" strokeWidth={22} opacity="0" />
        <circle cx="238" cy="188" r="12" fill="#ffe0c2" />
        <path d="M232 182c3-2 7-2 10 0" opacity="0.5" />
      </g>
    </svg>
  );
}
