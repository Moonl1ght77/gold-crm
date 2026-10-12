import { DIMS } from '../../src/data/model.ts';
import type { Db, Measure, Qty } from '../../src/data/model.ts';
import { db } from '../../src/data/seed.ts';
import type { Check } from './types.ts';

/** 设计稿第 8 节：编号静态可读、不重复 */
const ID_RULES: ReadonlyArray<readonly [keyof Db, RegExp]> = [
  ['materials', /^YL-\d{3}$/],
  ['suppliers', /^GY-\d{3}$/],
  ['batches', /^PC-\d{3}$/],
  ['movements', /^LS-\d{3}$/],
  ['series', /^[A-Z]$/],
  ['styles', /^[A-Z]\d$/],
  ['tasks', /^RW-\d{3}$/],
  ['goods', /^CP-\d{3}$/],
  ['customers', /^KH-\d{3}$/],
  ['orders', /^YW-\d{4}-\d{3}$/],
  ['approvals', /^SP-\d{3}$/],
];

export function checkData(check: Check): void {
  checkDb(check, db, '');
}

/** 结构检查：编号、整数、引用、计量形状、单粒宝石、任务与成品。tag 区分注入测试用的数据。 */
export function checkDb(check: Check, d: Db, tag: string): void {
  const ids: string[] = [];
  for (const [name, pattern] of ID_RULES) {
    for (const { id } of d[name]) {
      ids.push(id);
      check(pattern.test(id), `${tag}${name}：编号 ${id} 格式不对`);
    }
  }
  check(new Set(ids).size === ids.length, `${tag}编号有重复`);

  const notInt: string[] = [];
  JSON.stringify(d, (key, value: unknown) => {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) notInt.push(`${key}=${value}`);
    return value;
  });
  check(notInt.length === 0, `${tag}金额、重量、件数都应是整数：${notInt.join('，')}`);

  const has = (list: readonly { id: string }[], id: string | undefined, where: string) =>
    check(list.some(x => x.id === id), `${tag}${where} 引用了不存在的编号 ${id}`);
  const measureOf = (materialId: string | undefined) => d.materials.find(m => m.id === materialId)?.measure;
  const batchOf = (batchId: string) => d.batches.find(b => b.id === batchId);
  const fits = (measure: Measure | undefined, q: Qty, where: string) =>
    check(
      measure !== undefined && (['mg', 'count'] as const).every(k => (DIMS[measure].includes(k) ? (q[k] ?? 0) > 0 : q[k] === undefined)),
      `${tag}${where} 的数量写法和计量方式不符`,
    );
  const seriesMaterials = (styleId: string) => d.series.find(s => s.id === d.styles.find(x => x.id === styleId)?.series)?.materials ?? [];

  for (const m of d.materials) check(/^#[0-9a-f]{6}$/.test(m.swatch), `${tag}${m.id} 的色标应写成 #rrggbb（小写）`);
  for (const b of d.batches) {
    has(d.materials, b.material, b.id);
    has(d.suppliers, b.supplier, b.id);
    fits(measureOf(b.material), b.qty, b.id);
    if (b.stones) {
      const mg = b.stones.reduce((sum, s) => sum + s.mg, 0);
      check(b.qty.count === b.stones.length && b.qty.mg === mg, `${tag}${b.id} 的原量应等于逐粒合计`);
    }
  }
  for (const m of d.movements) {
    has(d.batches, m.batch, m.id);
    fits(measureOf(batchOf(m.batch)?.material), m, m.id);
  }
  for (const s of d.series) for (const id of s.materials) has(d.materials, id, `系列 ${s.id}`);
  for (const s of d.styles) {
    has(d.series, s.series, `款式 ${s.id}`);
    check(s.id.startsWith(s.series), `${tag}款式 ${s.id} 的编号应以系列 ${s.series} 开头`);
    for (const line of s.bom) {
      fits(measureOf(line.material), line, `款式 ${s.id}`);
      check(seriesMaterials(s.id).includes(line.material), `${tag}款式 ${s.id} 用了系列构成以外的原料 ${line.material}`);
    }
  }

  const certs: string[] = [];
  for (const t of d.tasks) {
    has(d.styles, t.style, t.id);
    if (t.order) has(d.orders, t.order, t.id);
    for (const line of t.usage) {
      const batch = batchOf(line.batch);
      has(d.batches, line.batch, t.id);
      fits(measureOf(batch?.material), line, `${t.id}（${line.batch}）`);
      check(seriesMaterials(t.style).includes(batch?.material ?? ''), `${tag}${t.id} 用了系列构成以外的原料（批次 ${line.batch}）`);
      check((line.cert !== undefined) === Boolean(batch?.stones), `${tag}${t.id}：单粒管理的批次要写证书号，其他批次不写`);
      if (line.cert !== undefined) {
        certs.push(line.cert);
        check(Boolean(batch?.stones?.some(s => s.cert === line.cert)), `${tag}${t.id} 的证书号 ${line.cert} 不在批次 ${line.batch} 里`);
      }
    }
    const made = d.goods.filter(g => g.task === t.id);
    check(made.length === (t.status === '已完成' ? 1 : 0), `${tag}${t.id}：已完成的任务出一件成品，未完成的不出`);
    if (t.order && made.length === 1) {
      check(Boolean(d.orders.find(o => o.id === t.order)?.goods.includes(made[0].id)), `${tag}${t.id} 的成品应列在业务单 ${t.order} 里`);
    }
  }
  check(new Set(certs).size === certs.length, `${tag}同一粒证书石被用了两次`);

  for (const g of d.goods) has(d.tasks, g.task, g.id);
  const sold = d.orders.flatMap(o => o.goods);
  check(new Set(sold).size === sold.length, `${tag}同一件成品出现在两张业务单里`);
  for (const o of d.orders) {
    has(d.customers, o.customer, o.id);
    for (const id of o.goods) has(d.goods, id, o.id);
  }
  for (const a of d.approvals) check(ids.includes(a.ref), `${tag}${a.id} 引用了不存在的编号 ${a.ref}`);
}
