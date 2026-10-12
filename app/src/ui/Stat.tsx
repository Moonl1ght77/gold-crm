import type { ReactNode } from 'react';
import type { Tone } from './StatusTag.tsx';

/** 指标卡；多张放进 <div className="stats"> 自动排列 */
export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <div className={tone ? `stat tone-${tone}` : 'stat'}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
