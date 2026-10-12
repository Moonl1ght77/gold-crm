import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { href, landingHref, moduleOf } from '../routes.ts';
import type { RouteMatch } from '../routes.ts';
import { canSee, visibleModules } from '../roles.ts';
import { ModuleTabs } from './ModuleTabs.tsx';
import { useShell } from './ShellContext.ts';

/** 390×844 手机框：企微式顶栏、内容区、底部四个 Tab（工作台／两个主模块／我的）。 */
export function PhoneFrame({ match, children }: { match: RouteMatch; children: ReactNode }) {
  const { role } = useShell();
  const [appsOpen, setAppsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const location = window.location.hash;
  const { route } = match;
  const inWecom = route.module === 'wecom';
  const isDetail = route.path.includes(':');

  useEffect(() => {
    setAppsOpen(false);
    contentRef.current?.scrollTo(0, 0);
  }, [location]);

  const current = (key: string) => (!appsOpen && route.module === key ? 'page' : undefined);

  return (
    <div className="phone-frame">
      <header className="phone-top">
        {isDetail && !appsOpen ? (
          <a className="icon-button" href={landingHref(route.module)} aria-label="返回列表">
            ‹
          </a>
        ) : (
          <span />
        )}
        <h1>{appsOpen ? '我的' : route.title}</h1>
        <span className="phone-top-more" aria-hidden="true">
          ···
        </span>
      </header>
      <div className="phone-content" ref={contentRef}>
        {appsOpen ? (
          <AppGrid onPick={() => setAppsOpen(false)} />
        ) : (
          <>
            {!inWecom && canSee(role, route.module) && <ModuleTabs match={match} />}
            {children}
          </>
        )}
      </div>
      {!inWecom && (
        <nav className="phone-tabs" aria-label="底部导航">
          <a href={href('/workbench')} aria-current={current('workbench')} onClick={() => setAppsOpen(false)}>
            工作台
          </a>
          {role.tabs.map(key => (
            <a key={key} href={landingHref(key)} aria-current={current(key)} onClick={() => setAppsOpen(false)}>
              {moduleOf(key).short}
            </a>
          ))}
          <button type="button" aria-current={appsOpen ? 'page' : undefined} onClick={() => setAppsOpen(true)}>
            我的
          </button>
        </nav>
      )}
    </div>
  );
}

/** "我的"：当前岗位可见的全部模块 */
function AppGrid({ onPick }: { onPick: () => void }) {
  const { role } = useShell();
  return (
    <section className="apps">
      <div className="me-card">
        <strong>{role.name}</strong>
        <span>{role.group} · 示例金店</span>
      </div>
      <h2 className="section-title">全部应用</h2>
      <ul className="app-grid">
        {visibleModules(role).map(m => (
          <li key={m.key}>
            <a href={landingHref(m.key)} onClick={onPick}>
              <span className="app-icon" aria-hidden="true">
                {m.short.slice(0, 1)}
              </span>
              {m.short}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
