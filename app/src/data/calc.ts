import { OUTLETS } from './model.ts';
import type { Batch, Db, FeeKind, Good, Material, Measure, Order, Outlet, Qty, Series, UsageLine } from './model.ts';

/**
 * 推算函数（设计稿第 7、8 节）：页面上的平衡、成本、毛利和合计都从这里来，不手写。
 * 都是纯函数，数据从参数 db 传入，检查脚本可以换一份数据（如注入铂金）照样跑。
 */

/** 推算结果里的数量：两个维度都给出，没用到的为 0 */
export type Amount = Required<Qty>;

/** 按编号取记录；编号都由检查脚本核过，取不到说明数据坏了，直接报错。 */
export function get<T extends { id: string }>(list: readonly T[], id: string): T {
  const found = list.find(x => x.id === id);
  if (!found) throw new Error(`找不到编号 ${id}`);
  return found;
}

export function sumBy<T>(list: readonly T[], value: (item: T) => number): number {
  return list.reduce((sum, item) => sum + value(item), 0);
}

function add(into: Amount, q: Qty): void {
  into.mg += q.mg ?? 0;
  into.count += q.count ?? 0;
}

/** 按计量方式算金额：price 按重量是分/克，按粒是分/克拉（1 ct＝200 mg），按件是分/件。 */
export function amountOf(measure: Measure, q: Qty, price: number): number {
  if (measure === 'piece') return (q.count ?? 0) * price;
  return Math.round(((q.mg ?? 0) * price) / (measure === 'weight' ? 1000 : 200));
}

function materialOf(db: Db, batchId: string): Material {
  return get(db.materials, get(db.batches, batchId).material);
}

/** 一行实际用料的成本：单粒宝石取该粒的采购价，其余按所用批次的单价。 */
export function lineCost(db: Db, line: UsageLine): number {
  const batch = get(db.batches, line.batch);
  const stone = batch.stones?.find(s => s.cert === line.cert);
  return stone ? stone.fen : amountOf(materialOf(db, line.batch).measure, line, batch.price);
}

export interface BatchBalance {
  batch: Batch;
  material: Material;
  parts: Record<Outlet, Amount>;
  total: Amount;
  balanced: boolean;
}

/** 批次平衡：成品耗用和在制取自生产任务的实际用料，其余四项取自库存流水，合计和采购原量对账。 */
export function batchBalance(db: Db, batch: Batch): BatchBalance {
  const parts = Object.fromEntries(OUTLETS.map(o => [o, { mg: 0, count: 0 }])) as Record<Outlet, Amount>;
  for (const task of db.tasks) {
    for (const line of task.usage) {
      if (line.batch === batch.id) add(parts[task.status === '已完成' ? '成品耗用' : '在制'], line);
    }
  }
  for (const m of db.movements) if (m.batch === batch.id) add(parts[m.kind], m);
  const total: Amount = { mg: 0, count: 0 };
  for (const o of OUTLETS) add(total, parts[o]);
  const balanced = total.mg === (batch.qty.mg ?? 0) && total.count === (batch.qty.count ?? 0);
  return { batch, material: get(db.materials, batch.material), parts, total, balanced };
}

export type BatchStatus = '未领用' | '在制' | '待核对' | '已结清';

/** 有在制先算在制，再看有没有待核对；都没有且有成品耗用就是已结清（余料在库不影响）。 */
export function batchStatus({ parts }: BatchBalance): BatchStatus {
  const has = (o: Outlet) => parts[o].mg > 0 || parts[o].count > 0;
  if (has('在制')) return '在制';
  if (has('待核对')) return '待核对';
  return has('成品耗用') ? '已结清' : '未领用';
}

/** 单件成本：原料按类别拆开；工费只计已确认的，没确认的列进 pending，页面显示"待补"。 */
export interface Cost {
  byCategory: Record<string, number>;
  labor: number;
  total: number;
  pending: FeeKind[];
}

export function goodCost(db: Db, good: Good): Cost {
  const task = get(db.tasks, good.task);
  const byCategory: Record<string, number> = {};
  for (const line of task.usage) {
    const { category } = materialOf(db, line.batch);
    byCategory[category] = (byCategory[category] ?? 0) + lineCost(db, line);
  }
  const labor = sumBy(task.fees.filter(f => f.confirmed), f => f.fen);
  const pending = task.fees.filter(f => !f.confirmed).map(f => f.kind);
  return { byCategory, labor, total: sumBy(Object.values(byCategory), v => v) + labor, pending };
}

export interface Margin {
  price?: number;
  cost: number;
  margin?: number;
  /** 有没确认的费用或还在制的任务，成本待补 */
  pending: boolean;
}

/** 业务单毛利＝成交价－已确认成本（设计稿第 6 节）；还没成交价的不算毛利。 */
export function orderMargin(db: Db, order: Order): Margin {
  const costs = order.goods.map(id => goodCost(db, get(db.goods, id)));
  const fees = order.fees ?? [];
  const cost = sumBy(costs, c => c.total) + sumBy(fees.filter(f => f.confirmed), f => f.fen);
  const pending =
    costs.some(c => c.pending.length > 0) || fees.some(f => !f.confirmed) || db.tasks.some(t => t.order === order.id && t.status !== '已完成');
  return { price: order.price, cost, margin: order.price === undefined ? undefined : order.price - cost, pending };
}

export interface UsageRow {
  material: Material;
  qty: Amount;
  fen: number;
  /** 金额占比，0–1 */
  share: number;
}

/** 系列实际耗用：该系列已完成任务的实际用料，按原料汇总用量、金额和金额占比。 */
export function seriesUsage(db: Db, series: Series): UsageRow[] {
  const rows = new Map<string, UsageRow>();
  for (const task of db.tasks) {
    if (task.status !== '已完成' || get(db.styles, task.style).series !== series.id) continue;
    for (const line of task.usage) {
      const material = materialOf(db, line.batch);
      const row = rows.get(material.id) ?? { material, qty: { mg: 0, count: 0 }, fen: 0, share: 0 };
      add(row.qty, line);
      row.fen += lineCost(db, line);
      rows.set(material.id, row);
    }
  }
  const total = sumBy([...rows.values()], r => r.fen);
  return [...rows.values()].map(r => ({ ...r, share: total > 0 ? r.fen / total : 0 }));
}
