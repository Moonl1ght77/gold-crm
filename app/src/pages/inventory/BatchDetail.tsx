import { batchBalance, batchStatus, get } from '../../data/calc.ts';
import type { BatchBalance, BatchStatus } from '../../data/calc.ts';
import { DIMS, OUTLETS } from '../../data/model.ts';
import type { Outlet } from '../../data/model.ts';
import { db } from '../../data/seed.ts';
import { detailHref, href } from '../../routes.ts';
import { DataList } from '../../ui/DataList.tsx';
import { carats, dimText, materialLabel, priceText, qtyText, yuan } from '../../ui/format.ts';
import { MaterialBadge } from '../../ui/MaterialBadge.tsx';
import { Fields, Section } from '../../ui/Section.tsx';
import { ShareBar } from '../../ui/ShareBar.tsx';
import { StageBar } from '../../ui/StageBar.tsx';
import { Stat } from '../../ui/Stat.tsx';
import type { Tone } from '../../ui/StatusTag.tsx';
import { Timeline } from '../../ui/Timeline.tsx';
import type { TimelineItem } from '../../ui/Timeline.tsx';
import type { PageProps } from '../registry.ts';
import { BatchTag } from './BatchList.tsx';

const STAGES = ['采购入库', '领用生产', '结清'];
const STAGE_OF: Record<BatchStatus, number> = { 未领用: 0, 在制: 1, 待核对: 1, 已结清: 2 };
const OUTLET_TONE: Partial<Record<Outlet, Tone>> = { 在制: 'info', 待核对: 'warn' };

/** 一个维度的平衡式："100 g ＝ 成品耗用 90 g ＋ 余料 5 g ＋ …"，只列不为零的去向 */
function Equation({ balance, dim }: { balance: BatchBalance; dim: 'mg' | 'count' }) {
  const { measure } = balance.material;
  const original = balance.batch.qty[dim] ?? 0;
  const terms = OUTLETS.filter(o => balance.parts[o][dim] > 0).map(o => `${o} ${dimText(measure, dim, balance.parts[o][dim])}`);
  return (
    <p className="equation">
      {dimText(measure, dim, original)} {original === balance.total[dim] ? '＝' : '≠'} {terms.join(' ＋ ') || dimText(measure, dim, 0)}
    </p>
  );
}

/** 批次详情：按该原料自己的单位平衡；宝石同时平衡粒数和重量，单粒主石列出证书号。 */
export function BatchDetail({ params }: PageProps) {
  const batch = db.batches.find(b => b.id === params.id);
  if (!batch) return <p className="page muted">找不到批次 {params.id}。</p>;
  const balance = batchBalance(db, batch);
  const { material, parts } = balance;
  const { measure } = material;
  const supplier = get(db.suppliers, batch.supplier);
  // 色条按该计量方式的第一个维度画：重量按毫克，宝石和配件按粒数、件数
  const dim = DIMS[measure][0];

  const usage = db.tasks.flatMap(task =>
    task.usage
      .filter(line => line.batch === batch.id)
      .map((line, i): TimelineItem => {
        const done = task.status === '已完成';
        const good = db.goods.find(g => g.task === task.id);
        return {
          key: `${task.id}-${i}`,
          at: task.at,
          tone: done ? undefined : 'info',
          title: (
            <>
              {done ? '成品耗用' : '在制'} {qtyText(measure, line)} · <a href={detailHref('/production/tasks/:id', task.id)}>{task.id}</a>
            </>
          ),
          detail: (
            <>
              {get(db.styles, task.style).name}
              {line.cert && ` · 证书 ${line.cert}`}
              {good && (
                <>
                  {' · 成品 '}
                  <a href={detailHref('/inventory/goods/:id', good.id)}>{good.id}</a>
                </>
              )}
            </>
          ),
        };
      }),
  );
  const moves = db.movements
    .filter(m => m.batch === batch.id)
    .map(
      (m): TimelineItem => ({
        key: m.id,
        at: m.at,
        tone: m.kind === '待核对' ? 'warn' : undefined,
        title: (
          <>
            {m.kind} {qtyText(measure, m)} · <a href={href('/inventory/movements')}>{m.id}</a>
          </>
        ),
        detail: m.note,
      }),
    );
  const records: TimelineItem[] = [{ key: 'in', at: batch.receivedAt, title: `采购入库 ${qtyText(measure, batch.qty)}`, detail: supplier.name }, ...usage, ...moves];
  records.sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="page">
      <Section title={`${batch.id} · ${materialLabel(material)}`} extra={<BatchTag balance={balance} />}>
        <StageBar stages={STAGES} current={STAGE_OF[batchStatus(balance)]} />
        <Fields
          items={[
            ['原料', <a href={href('/inventory/materials')}><MaterialBadge material={material} /></a>],
            ['类别', material.category],
            ['供应商', supplier.name],
            ['入库日期', batch.receivedAt],
            ['采购价', batch.stones ? `逐粒计价，均价 ${priceText(measure, batch.price)}` : priceText(measure, batch.price)],
            ['原量', qtyText(measure, batch.qty)],
          ]}
        />
      </Section>

      <Section title="平衡">
        {!balance.balanced && <p className="alert">去向合计对不上采购原量，核对库存流水和生产领料。</p>}
        {DIMS[measure].map(d => (
          <Equation key={d} balance={balance} dim={d} />
        ))}
        <ShareBar
          label={`${batch.id} 去向`}
          shares={OUTLETS.map((o, i) => ({ key: o, slot: i + 1, value: parts[o][dim], name: o, text: dimText(measure, dim, parts[o][dim]) }))}
        />
        <div className="stats">
          {OUTLETS.map(o => (
            <Stat key={o} label={o} value={qtyText(measure, parts[o])} tone={parts[o].mg > 0 || parts[o].count > 0 ? OUTLET_TONE[o] : undefined} />
          ))}
        </div>
      </Section>

      {batch.stones && (
        <Section title="单粒主石">
          <DataList
            rows={batch.stones}
            rowKey={s => s.cert}
            columns={[
              { label: '证书号', render: s => s.cert },
              { label: '重量', num: true, render: s => carats(s.mg) },
              { label: '采购价', num: true, render: s => yuan(s.fen) },
              {
                label: '去向',
                render: s => {
                  const task = db.tasks.find(t => t.usage.some(l => l.cert === s.cert));
                  return task ? (
                    <>
                      已领用 · <a href={detailHref('/production/tasks/:id', task.id)}>{task.id}</a>
                    </>
                  ) : (
                    '在库'
                  );
                },
              },
            ]}
          />
        </Section>
      )}

      <Section title="去向记录">
        <Timeline items={records} />
      </Section>
    </div>
  );
}
