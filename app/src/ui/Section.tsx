import { Fragment } from 'react';
import type { ReactNode } from 'react';

/** 详情分区：带标题的一块内容，extra 放在标题右侧（如状态标签） */
export function Section({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <header className="section-head">
        <h2>{title}</h2>
        {extra}
      </header>
      {children}
    </section>
  );
}

/** 字段表：[标签, 值] 两列 */
export function Fields({ items }: { items: ReadonlyArray<readonly [string, ReactNode]> }) {
  return (
    <dl className="fields">
      {items.map(([label, value]) => (
        <Fragment key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
