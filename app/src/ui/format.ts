import type { Material, Measure, Qty } from '../data/model.ts';

function decimal(n: number, min: number, max: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: min, maximumFractionDigits: max });
}

/** 分 → "¥1,234.56"；负数 "−¥300.00" */
export function yuan(fen: number): string {
  return `${fen < 0 ? '−' : ''}¥${decimal(Math.abs(fen) / 100, 2, 2)}`;
}

/** 毫克 → "90 g"、"0.3 g"（精确到毫克，不补零） */
export function grams(mg: number): string {
  return `${decimal(mg / 1000, 0, 3)} g`;
}

/** 毫克 → "2.40 ct"（1 ct＝200 mg） */
export function carats(mg: number): string {
  return `${decimal(mg / 200, 2, 3)} ct`;
}

/** 按计量方式的一个维度显示：粒数／件数，或重量（宝石用克拉） */
export function dimText(measure: Measure, dim: 'mg' | 'count', n: number): string {
  if (dim === 'count') return `${n} ${measure === 'piece' ? '件' : '粒'}`;
  return measure === 'stone' ? carats(n) : grams(n);
}

/** 数量按计量方式显示："90 g"、"10 粒 / 0.50 ct"、"3 件" */
export function qtyText(measure: Measure, q: Qty): string {
  if (measure === 'weight') return grams(q.mg ?? 0);
  if (measure === 'piece') return dimText(measure, 'count', q.count ?? 0);
  return `${dimText(measure, 'count', q.count ?? 0)} / ${carats(q.mg ?? 0)}`;
}

const PRICE_UNIT: Record<Measure, string> = { weight: '克', stone: '克拉', piece: '件' };

/** 单价："¥780.00/克" */
export function priceText(measure: Measure, fen: number): string {
  return `${yuan(fen)}/${PRICE_UNIT[measure]}`;
}

/** 原料名带成色："足金（990‰）"；没有成色的只显示名称 */
export function materialLabel(m: Material): string {
  return m.fineness ? `${m.name}（${m.fineness}‰）` : m.name;
}
