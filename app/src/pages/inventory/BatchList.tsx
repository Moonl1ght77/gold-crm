import { useState } from 'react';
import { batchBalance, batchStatus, get } from '../../data/calc.ts';
import type { BatchBalance, BatchStatus } from '../../data/calc.ts';
import { db } from '../../data/seed.ts';
import { detailHref } from '../../routes.ts';
import { DataList } from '../../ui/DataList.tsx';
import { priceText, qtyText } from '../../ui/format.ts';
import { MaterialBadge } from '../../ui/MaterialBadge.tsx';
import { StatusTag } from '../../ui/StatusTag.tsx';
import type { Tone } from '../../ui/StatusTag.tsx';

const STATUS_TONE: Record<BatchStatus, Tone> = { 未领用: 'muted', 在制: 'info', 待核对: 'warn', 已结清: 'ok' };

/** 批次状态标签；去向对不上原量时直接标"不平" */
export function BatchTag({ balance }: { balance: BatchBalance }) {
  if (!balance.balanced) return <StatusTag tone="bad">不平</StatusTag>;
  const status = batchStatus(balance);
  return <StatusTag tone={STATUS_TONE[status]}>{status}</StatusTag>;
}

const ALL = '全部';

/** 原料批次：来源、采购价和余量（按各自单位），可按原料类别筛选。类别从数据里取，新原料不用改这里。 */
export function BatchList() {
  const [category, setCategory] = useState(ALL);
  const all = db.batches.map(b => batchBalance(db, b));
  const categories = [ALL, ...new Set(all.map(b => b.material.category))];
  const rows = all.filter(b => category === ALL || b.material.category === category);
  return (
    <div className="page">
      <div className="chips" role="group" aria-label="原料类别">
        {categories.map(c => (
          <button key={c} type="button" aria-pressed={c === category} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <DataList
        rows={rows}
        rowKey={b => b.batch.id}
        columns={[
          { label: '批次', render: b => <a href={detailHref('/inventory/batches/:id', b.batch.id)}>{b.batch.id}</a> },
          { label: '原料', render: b => <MaterialBadge material={b.material} /> },
          { label: '来源', render: b => get(db.suppliers, b.batch.supplier).name },
          { label: '采购价', num: true, render: b => (b.batch.stones ? '逐粒计价' : priceText(b.material.measure, b.batch.price)) },
          { label: '原量', num: true, render: b => qtyText(b.material.measure, b.batch.qty) },
          { label: '余量', num: true, render: b => qtyText(b.material.measure, b.parts['余料']) },
          { label: '状态', render: b => <BatchTag balance={b} /> },
        ]}
      />
    </div>
  );
}
