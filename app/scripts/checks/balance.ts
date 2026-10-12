import { batchBalance, batchStatus, get } from '../../src/data/calc.ts';
import { OUTLETS } from '../../src/data/model.ts';
import type { Batch, Db, Material, Movement } from '../../src/data/model.ts';
import { db } from '../../src/data/seed.ts';
import { checkDb } from './data.ts';
import type { Check } from './types.ts';

/** 按 OUTLETS 顺序（成品耗用 余料 回收料 确认损耗 在制 待核对）写成一行，单位毫克；宝石写成"粒/毫克"。 */
function outlets(d: Db, batchId: string): string {
  const { parts } = batchBalance(d, get(d.batches, batchId));
  return OUTLETS.map(o => (parts[o].count > 0 ? `${parts[o].count}/${parts[o].mg}` : `${parts[o].mg}`)).join(' ');
}

export function checkBalance(check: Check): void {
  for (const b of db.batches) {
    const { balanced, total } = batchBalance(db, b);
    check(balanced, `${b.id} 不平：原量 ${JSON.stringify(b.qty)}，去向合计 ${JSON.stringify(total)}`);
  }

  // 设计稿第 10 节第 4 条
  check(outlets(db, 'PC-001') === '90000 5000 3000 2000 0 0', `PC-001 应为 100g＝90＋5＋3＋2，实际 ${outlets(db, 'PC-001')}`);
  check(outlets(db, 'PC-004') === '48/480 10/100 0 1/10 0 1/10', `PC-004 应为 60 粒＝48＋10＋1＋1、600mg＝480＋100＋10＋10，实际 ${outlets(db, 'PC-004')}`);
  check(outlets(db, 'PC-002') === '0 29700 0 0 20000 300', `PC-002 应在制 20 g、待核对 0.3 g，实际 ${outlets(db, 'PC-002')}`);
  const status = (id: string) => batchStatus(batchBalance(db, get(db.batches, id)));
  check(status('PC-001') === '已结清' && status('PC-002') === '在制' && status('PC-004') === '待核对', '批次状态推算不对');

  // 设计稿第 10 节第 9 条：临时加一种原料（铂金）和一个批次，推算和检查照常工作
  const platinum: Material = { id: 'YL-099', name: '铂金', category: '贵金属', measure: 'weight', swatch: '#dcdfe2', fineness: 950, refPrice: 30000, priceSource: '注入测试', lossRate: 5 };
  const ptBatch: Batch = { id: 'PC-099', material: 'YL-099', supplier: 'GY-001', receivedAt: '2026-10-12', qty: { mg: 10000 }, price: 29000 };
  const ptLeft: Movement = { id: 'LS-099', batch: 'PC-099', kind: '余料', mg: 10000, at: '2026-10-12', note: '注入测试' };
  const withPt: Db = { ...db, materials: [...db.materials, platinum], batches: [...db.batches, ptBatch], movements: [...db.movements, ptLeft] };
  checkDb(check, withPt, '（注入铂金后）');
  check(batchBalance(withPt, ptBatch).balanced && outlets(withPt, 'PC-099') === '0 10000 0 0 0 0', '注入的铂金批次应按重量平衡');

  // 反例：少记 1 g 去向必须判为不平，说明平衡检查不是自己验自己
  const broken: Db = { ...withPt, movements: [...db.movements, { ...ptLeft, mg: 9000 }] };
  check(!batchBalance(broken, ptBatch).balanced, '少记 1 g 去向时应判为不平');
}
