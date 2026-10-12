import type { RouteMatch } from '../routes.ts';
import { useShell } from './ShellContext.ts';

/** 页面说明：这页做什么、对应图稿哪个主题、哪些待商家核实。 */
export function NotesPanel({ match, onClose }: { match: RouteMatch; onClose: () => void }) {
  const { view } = useShell();
  const { route } = match;
  return (
    <aside className={`notes notes-${view}`} aria-label="页面说明">
      <header className="notes-head">
        <strong>页面说明</strong>
        <button type="button" className="icon-button" onClick={onClose} aria-label="关闭页面说明">
          ×
        </button>
      </header>
      <h2>{route.title}</h2>
      <p>{route.note.does}</p>
      <dl>
        <dt>对应</dt>
        <dd>{route.note.source}</dd>
        {route.note.pending && (
          <>
            <dt>待商家核实</dt>
            <dd>{route.note.pending}</dd>
          </>
        )}
      </dl>
      {route.verify && <p className="verify-banner">※ 本页整体待商家核实</p>}
    </aside>
  );
}
