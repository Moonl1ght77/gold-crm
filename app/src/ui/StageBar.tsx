/** 阶段条：current 之前的为已完成，current 为当前阶段 */
export function StageBar({ stages, current }: { stages: readonly string[]; current: number }) {
  return (
    <ol className="stage-bar">
      {stages.map((stage, i) => (
        <li key={stage} className={i < current ? 'done' : undefined} aria-current={i === current ? 'step' : undefined}>
          {stage}
        </li>
      ))}
    </ol>
  );
}
