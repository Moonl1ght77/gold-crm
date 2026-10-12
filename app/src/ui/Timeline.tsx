import type { ReactNode } from 'react';
import type { Tone } from './StatusTag.tsx';

export interface TimelineItem {
  key: string;
  at: string;
  title: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
}

/** 时间线：按传入顺序显示，排序由调用方决定 */
export function Timeline({ items }: { items: readonly TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map(item => (
        <li key={item.key} className={item.tone ? `tone-${item.tone}` : undefined}>
          <time>{item.at}</time>
          <div>{item.title}</div>
          {item.detail && <div className="muted">{item.detail}</div>}
        </li>
      ))}
    </ol>
  );
}
