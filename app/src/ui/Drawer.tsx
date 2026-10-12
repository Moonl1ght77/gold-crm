import type { ReactNode } from 'react';

/** 桌面详情抽屉：叠在列表右侧，关闭就是回到列表地址 */
export function Drawer({ title, closeHref, children }: { title: string; closeHref: string; children: ReactNode }) {
  return (
    <aside className="drawer" aria-label={title}>
      <header className="drawer-head">
        <strong>{title}</strong>
        <a className="icon-button" href={closeHref} aria-label="关闭详情">
          ×
        </a>
      </header>
      <div className="drawer-body">{children}</div>
    </aside>
  );
}
