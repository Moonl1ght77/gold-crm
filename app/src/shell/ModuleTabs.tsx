import { activeNavRoute, navHref, navRoutesOf } from '../routes.ts';
import type { RouteMatch } from '../routes.ts';

/** 手机视图：模块内的页面切换条。 */
export function ModuleTabs({ match }: { match: RouteMatch }) {
  const items = navRoutesOf(match.route.module);
  if (items.length < 2) return null;
  const active = activeNavRoute(match);
  return (
    <nav className="module-tabs" aria-label="本模块页面">
      {items.map(r => (
        <a key={r.path} href={navHref(r)} aria-current={r === active ? 'page' : undefined}>
          {r.title}
        </a>
      ))}
    </nav>
  );
}
