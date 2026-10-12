import { moduleOf } from '../routes.ts';
import type { AppRoute } from '../routes.ts';

export function Placeholder({ route }: { route: AppRoute }) {
  return (
    <section className="placeholder">
      <p className="eyebrow">{moduleOf(route.module).name}</p>
      <h2>{route.title}</h2>
      <p>{route.note.does}</p>
      <p className="muted">这一页还在搭建，按实施计划分批补上。</p>
    </section>
  );
}
