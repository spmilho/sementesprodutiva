/**
 * SVG illustrations of corn plants at each phenological stage.
 * Each plant grows taller with more leaves as the stage advances.
 */

interface CornPlantProps {
  stage: string;
  isFuture?: boolean;
  isCurrent?: boolean;
  size?: number; // base height multiplier
}

const GREEN = "#4CAF50";
const DARK_GREEN = "#388E3C";
const STALK = "#795548";
const YELLOW = "#FBC02D";
const BROWN_DRY = "#A1887F";
const GRAY = "#E0E0E0";
const GRAY_DARK = "#BDBDBD";

// Each stage config: height, leaf count, features
const STAGE_CONFIG: Record<string, {
  h: number; leaves: number; stalkW: number;
  tassel?: boolean; ear?: boolean; earSize?: number;
  silks?: boolean; kernels?: boolean; drying?: number; // 0-1 how dry
}> = {
  VE:  { h: 30, leaves: 2, stalkW: 2 },
  V1:  { h: 35, leaves: 2, stalkW: 2 },
  V2:  { h: 40, leaves: 3, stalkW: 2.5 },
  V4:  { h: 50, leaves: 4, stalkW: 3 },
  V6:  { h: 60, leaves: 5, stalkW: 3.5 },
  V10: { h: 75, leaves: 6, stalkW: 4 },
  V12: { h: 85, leaves: 7, stalkW: 4.5 },
  "V14/Vn": { h: 95, leaves: 8, stalkW: 5 },
  VT:  { h: 105, leaves: 8, stalkW: 5, tassel: true },
  R1:  { h: 110, leaves: 8, stalkW: 5, tassel: true, ear: true, earSize: 8, silks: true },
  R2:  { h: 110, leaves: 8, stalkW: 5, tassel: true, ear: true, earSize: 10 },
  R3:  { h: 110, leaves: 8, stalkW: 5, tassel: true, ear: true, earSize: 12, kernels: true },
  R4:  { h: 110, leaves: 7, stalkW: 5, tassel: true, ear: true, earSize: 14, kernels: true, drying: 0.2 },
  R5:  { h: 108, leaves: 7, stalkW: 5, tassel: true, ear: true, earSize: 15, kernels: true, drying: 0.5 },
  R6:  { h: 105, leaves: 6, stalkW: 5, tassel: true, ear: true, earSize: 16, kernels: true, drying: 1 },
};

export default function CornPlantSvg({ stage, isFuture = false, isCurrent = false, size = 1 }: CornPlantProps) {
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.VE;
  const h = cfg.h * size;
  const svgH = h + 20; // extra for tassel/roots
  const svgW = 60 * size;
  const cx = svgW / 2;
  const baseY = svgH - 4;

  // Colors based on state
  const leafColor = isFuture ? GRAY : (cfg.drying ? lerpColor(GREEN, BROWN_DRY, cfg.drying) : GREEN);
  const leafDark = isFuture ? GRAY_DARK : (cfg.drying ? lerpColor(DARK_GREEN, "#8D6E63", cfg.drying) : DARK_GREEN);
  const stalkColor = isFuture ? GRAY_DARK : (cfg.drying ? lerpColor(STALK, "#8D6E63", cfg.drying) : STALK);
  const tasselColor = isFuture ? GRAY : YELLOW;
  const earColor = isFuture ? GRAY : "#FFF9C4";
  const earHuskColor = isFuture ? GRAY_DARK : "#81C784";
  const silkColor = isFuture ? GRAY : "#F48FB1";
  const kernelColor = isFuture ? GRAY : "#FFD54F";

  // Generate leaves
  const leaves: JSX.Element[] = [];
  const leafSpacing = (h - 10) / (cfg.leaves + 1);
  for (let i = 0; i < cfg.leaves; i++) {
    const y = baseY - 10 - leafSpacing * (i + 1);
    const leafLen = (12 + i * 2.5) * size;
    const leafH = (3 + i * 0.5) * size;
    const side = i % 2 === 0 ? 1 : -1;
    const angle = side * (25 + i * 2);
    leaves.push(
      <ellipse
        key={`leaf-${i}`}
        cx={cx + side * leafLen * 0.4}
        cy={y}
        rx={leafLen}
        ry={leafH}
        fill={i % 2 === 0 ? leafColor : leafDark}
        transform={`rotate(${angle} ${cx + side * leafLen * 0.4} ${y})`}
        opacity={isFuture ? 0.4 : 0.9}
      />
    );
  }

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className={isCurrent ? "drop-shadow-[0_0_6px_rgba(255,193,7,0.7)]" : ""}
    >
      {/* Current stage glow */}
      {isCurrent && !isFuture && (
        <circle cx={cx} cy={baseY - h / 2} r={h * 0.45} fill="none" stroke="#FFC107" strokeWidth={1.5} opacity={0.4}>
          <animate attributeName="r" values={`${h * 0.4};${h * 0.5};${h * 0.4}`} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Stalk */}
      <rect
        x={cx - cfg.stalkW * size / 2}
        y={baseY - h}
        width={cfg.stalkW * size}
        height={h}
        rx={1}
        fill={stalkColor}
        opacity={isFuture ? 0.3 : 1}
      />

      {/* Leaves */}
      <g opacity={isFuture ? 0.15 : 1}>
        {leaves}
      </g>

      {/* Tassel */}
      {cfg.tassel && (
        <g opacity={isFuture ? 0.15 : 0.9}>
          {/* Main tassel branches */}
          {[-8, -3, 0, 3, 8].map((dx, i) => (
            <line
              key={`t-${i}`}
              x1={cx}
              y1={baseY - h}
              x2={cx + dx * size}
              y2={baseY - h - (10 + Math.abs(dx)) * size}
              stroke={tasselColor}
              strokeWidth={1.5 * size}
              strokeLinecap="round"
            />
          ))}
        </g>
      )}

      {/* Ear */}
      {cfg.ear && cfg.earSize && (
        <g opacity={isFuture ? 0.15 : 1}>
          {/* Husk */}
          <ellipse
            cx={cx + 10 * size}
            cy={baseY - h * 0.45}
            rx={cfg.earSize * 0.4 * size}
            ry={cfg.earSize * size}
            fill={earHuskColor}
            transform={`rotate(10 ${cx + 10 * size} ${baseY - h * 0.45})`}
          />
          {/* Ear core */}
          <ellipse
            cx={cx + 11 * size}
            cy={baseY - h * 0.45}
            rx={cfg.earSize * 0.3 * size}
            ry={cfg.earSize * 0.85 * size}
            fill={cfg.kernels ? kernelColor : earColor}
            transform={`rotate(10 ${cx + 11 * size} ${baseY - h * 0.45})`}
          />
          {/* Silks */}
          {cfg.silks && (
            <g>
              {[0, 1, 2, 3].map(i => (
                <line
                  key={`silk-${i}`}
                  x1={cx + 12 * size}
                  y1={baseY - h * 0.45 - cfg.earSize! * 0.7 * size}
                  x2={cx + (14 + i * 2) * size}
                  y2={baseY - h * 0.45 - cfg.earSize! * (0.8 + i * 0.15) * size}
                  stroke={silkColor}
                  strokeWidth={0.8 * size}
                  strokeLinecap="round"
                />
              ))}
            </g>
          )}
        </g>
      )}

      {/* Small roots at base */}
      {!isFuture && (
        <g opacity={0.4}>
          <line x1={cx} y1={baseY} x2={cx - 4 * size} y2={baseY + 3 * size} stroke={stalkColor} strokeWidth={0.8} />
          <line x1={cx} y1={baseY} x2={cx + 4 * size} y2={baseY + 3 * size} stroke={stalkColor} strokeWidth={0.8} />
        </g>
      )}
    </svg>
  );
}

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.replace("#", ""), 16);
  const bh = parseInt(b.replace("#", ""), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, "0")}`;
}
