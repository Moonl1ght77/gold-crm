export interface Share {
  key: string;
  /** 类别色序号 1–6（tokens.css 的 --series-N），跟着类别固定，不按大小排 */
  slot: number;
  value: number;
  /** 图例上的名称 */
  name: string;
  /** 数值文字，用在悬停提示和读屏说明里 */
  text: string;
}

/** 占比色条：一条按比例分段的横条加图例；为零的段不画。精确数值由页面另用文字给出。 */
export function ShareBar({ shares, label }: { shares: readonly Share[]; label: string }) {
  const parts = shares.filter(s => s.value > 0);
  if (parts.length === 0) return null;
  return (
    <div className="share">
      <div className="share-bar" role="img" aria-label={`${label}：${parts.map(s => `${s.name} ${s.text}`).join('，')}`}>
        {parts.map(s => (
          <span key={s.key} title={`${s.name} ${s.text}`} style={{ flexGrow: s.value, background: `var(--series-${s.slot})` }} />
        ))}
      </div>
      <ul className="legend">
        {parts.map(s => (
          <li key={s.key}>
            <i style={{ background: `var(--series-${s.slot})` }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
