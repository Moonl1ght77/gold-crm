import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { activeNavRoute, landingHref, navHref, navRoutesOf } from '../routes.ts';
import type { RouteMatch } from '../routes.ts';
import { visibleModules } from '../roles.ts';
import { useShell } from './ShellContext.ts';

/** 模拟企微桌面端：左侧模块侧栏（当前模块展开子页面），右侧主区。企微形态下不显示侧栏。 */
export function DesktopFrame({ match, children }: { match: RouteMatch; children: ReactNode }) {
  const { role } = useShell();
  const mainRef = useRef<HTMLElement>(null);
  const location = window.location.hash;
  const { route } = match;
  const active = activeNavRoute(match);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location]);

  if (route.module === 'wecom') {
    return (
      <div className="desktop-frame desktop-wecom">
        <main className="desktop-main" ref={mainRef}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="desktop-frame">
      <aside className="desktop-side">
        <div className="desktop-brand">
          <strong>示例金店</strong>
          <span>企业微信 · 工作台应用</span>
        </div>
        <nav aria-label="模块">
          {visibleModules(role).map(m => {
            const current = m.key === route.module;
            const subPages = navRoutesOf(m.key);
            const access = role.access[m.key];
            return (
              <div key={m.key}>
                <a className="side-module" href={landingHref(m.key)} aria-current={current ? 'true' : undefined}>
                  <span>{m.name}</span>
                  {access && <span className="access">{access === 'main' ? '主' : '看'}</span>}
                </a>
                {current && subPages.length > 1 && (
                  <ul className="side-pages">
                    {subPages.map(r => (
                      <li key={r.path}>
                        <a href={navHref(r)} aria-current={r === active ? 'page' : undefined}>
                          {r.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
      <main className="desktop-main" ref={mainRef}>
        <header className="desktop-head">
          <h1>{route.title}</h1>
        </header>
        {children}
      </main>
    </div>
  );
}
