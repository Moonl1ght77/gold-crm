import { href, navHref } from '../routes.ts';
import type { RouteMatch } from '../routes.ts';
import { canSee } from '../roles.ts';
import { Placeholder } from '../pages/Placeholder.tsx';
import { drawerParent, pages } from '../pages/registry.ts';
import { Drawer } from '../ui/Drawer.tsx';
import { useShell } from './ShellContext.ts';

const EXTERNAL_ONLY: readonly string[] = ['/wecom/sidebar', '/wecom/contacts'];

/** 当前路由 → 页面；顺带处理岗位看不到的模块、非客户岗位进企微客户形态两种情况。桌面视图的详情页放进抽屉。 */
export function Screen({ match }: { match: RouteMatch }) {
  const { role, view } = useShell();
  const { route, params } = match;
  if (!canSee(role, route.module)) {
    return <Notice title="本岗位看不到这个模块" text={`${role.name}的导航里没有这个入口。`} />;
  }
  if (EXTERNAL_ONLY.includes(route.path) && !role.external) {
    return <Notice title="本岗位无外部客户" text="聊天侧边栏和客户联系只对老板、总经理、品牌线上运营、店长、门店顾问开放。" />;
  }
  const Page = pages[route.path];
  const page = Page ? <Page params={params} /> : <Placeholder route={route} />;
  const parent = drawerParent(match, view);
  const ParentPage = parent ? pages[parent.path] : undefined;
  const scope = role.scope?.[route.module];
  return (
    <>
      {scope && <p className="scope-line">本岗位范围：{scope}</p>}
      {route.verify && <p className="verify-banner">※ 本页待商家核实</p>}
      {parent && ParentPage ? (
        <>
          <ParentPage params={{}} />
          <Drawer key={params.id} title={route.title} closeHref={navHref(parent)}>
            {page}
          </Drawer>
        </>
      ) : (
        page
      )}
    </>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <section className="notice">
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      <a className="button" href={href('/workbench')}>
        回工作台
      </a>
    </section>
  );
}
