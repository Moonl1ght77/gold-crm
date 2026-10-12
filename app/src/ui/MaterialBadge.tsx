import type { ReactNode } from 'react';
import type { Material, Measure } from '../data/model.ts';
import { materialLabel } from './format.ts';

/** 计量方式图标：按重量是砝码，按粒是宝石，按件是链扣 */
const ICONS: Record<Measure, ReactNode> = {
  weight: (
    <>
      <circle cx="8" cy="3.5" r="2" />
      <path d="M4.5 6.5h7l2 7.5h-11z" />
    </>
  ),
  stone: <path d="M4.5 2.5h7l3 3.5L8 14 1.5 6zM1.5 6h13" />,
  piece: (
    <>
      <rect x="1.5" y="5" width="8" height="6" rx="3" />
      <rect x="6.5" y="5" width="8" height="6" rx="3" />
    </>
  ),
};

/** 原料徽章：色标是原料本色（数据里的 swatch），图标按计量方式，新原料只填颜色就能显示。 */
export function MaterialBadge({ material }: { material: Material }) {
  return (
    <span className="material">
      <span className="swatch" style={{ background: material.swatch }} aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14">
          {ICONS[material.measure]}
        </svg>
      </span>
      {materialLabel(material)}
    </span>
  );
}
