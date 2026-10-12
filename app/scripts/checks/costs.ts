import { amountOf, batchBalance, get, goodCost, orderMargin, seriesUsage, sumBy } from '../../src/data/calc.ts';
import type { Amount } from '../../src/data/calc.ts';
import { db } from '../../src/data/seed.ts';
import type { Check } from './types.ts';

export function checkCosts(check: Check): void {
  // 三种计量方式的金额换算
  check(amountOf('weight', { mg: 1500 }, 80000) === 120000, '按重量：1.5 g × ¥800/克 应为 ¥1,200');
  check(amountOf('stone', { count: 1, mg: 10 }, 500000) === 25000, '按粒：0.05 ct × ¥5,000/克拉 应为 ¥250');
  check(amountOf('piece', { count: 3 }, 1500) === 4500, '按件：3 件 × ¥15/件 应为 ¥45');

  // 单件成本按原料类别拆开：18K 金 4 g、证书主石 1 粒、白钻 16 粒，加已确认工费
  const d1 = JSON.stringify(goodCost(db, get(db.goods, 'CP-007')));
  check(d1 === '{"byCategory":{"贵金属":232000,"彩钻":1800000,"钻石":384000},"labor":81000,"total":2497000,"pending":[]}', `CP-007 成本不对：${d1}`);
  const b2 = goodCost(db, get(db.goods, 'CP-004'));
  check(b2.total === 634800 && b2.pending.join() === '珐琅工艺费', `CP-004 应计 ¥6,348，珐琅工艺费列为待补，实际 ${JSON.stringify(b2)}`);

  // 业务单毛利＝成交价－已确认成本（设计稿第 6 节）
  const margin = (id: string) => JSON.stringify(orderMargin(db, get(db.orders, id)));
  check(margin('YW-2026-001') === '{"price":3580000,"cost":3160000,"margin":420000,"pending":false}', `YW-2026-001 毛利不对：${margin('YW-2026-001')}`);
  check(margin('YW-2026-005') === '{"price":980000,"cost":634800,"margin":345200,"pending":true}', `YW-2026-005 应带待补成本：${margin('YW-2026-005')}`);
  check(margin('YW-2026-006') === '{"price":0,"cost":30000,"margin":-30000,"pending":false}', `取消单应保留已发生费用：${margin('YW-2026-006')}`);
  check(margin('YW-2026-002') === '{"price":2700000,"cost":0,"margin":2700000,"pending":true}', `在制的定制单成本应待补：${margin('YW-2026-002')}`);
  check(orderMargin(db, get(db.orders, 'YW-2026-007')).margin === undefined, '还没成交价的业务单不算毛利');

  // 系列实际耗用：B 系列＝足金 20 g＋珐琅 1.2 g
  const b = seriesUsage(db, get(db.series, 'B'))
    .map(r => `${r.material.id}:${r.qty.mg}:${r.fen}`)
    .join(' ');
  check(b === 'YL-001:20000:1560000 YL-007:1200:2400', `B 系列耗用不对：${b}`);

  // 交叉核对：各系列实际耗用按原料加总，应等于各批次的成品耗用
  const total = (list: Amount[]) => `${sumBy(list, a => a.mg)} mg / ${sumBy(list, a => a.count)}`;
  for (const m of db.materials) {
    const bySeries = total(db.series.flatMap(s => seriesUsage(db, s).filter(r => r.material.id === m.id).map(r => r.qty)));
    const byBatch = total(db.batches.filter(x => x.material === m.id).map(x => batchBalance(db, x).parts['成品耗用']));
    check(bySeries === byBatch, `${m.name}：各系列耗用合计 ${bySeries}，各批次成品耗用 ${byBatch}，对不上`);
  }
}
