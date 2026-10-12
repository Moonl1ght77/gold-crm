import { activeNavRoute, detailHref, href, matchRoute, modules, navModules, navRoutesOf, routes } from '../../src/routes.ts';
import type { Check } from './types.ts';

/** 设计稿第 4 节标 ※ 的四页 */
const VERIFY_PAGES = ['/finance/deposits', '/finance/accounts', '/finance/statement-import', '/accounting/tax'];

export function checkRoutes(check: Check): void {
  const paths = routes.map(r => r.path);
  check(routes.length === 67, `路由应为 67 页，实际 ${routes.length} 页`);
  check(new Set(paths).size === paths.length, '路由路径有重复');
  check(navModules.length === 13, `导航模块应为 13 个，实际 ${navModules.length} 个`);

  for (const r of routes) {
    check(r.path.split('/')[1] === r.module, `${r.path}：路径第一段应等于模块 ${r.module}`);
    check(!r.path.includes(':') || (r.path.endsWith('/:id') && r.path.split(':').length === 2), `${r.path}：详情页只能有一个参数且写成 /:id`);
    check(r.title.trim() !== '' && r.note.does.trim() !== '' && r.note.source.trim() !== '', `${r.path}：标题、说明或来源为空`);
    check(Boolean(r.verify) === VERIFY_PAGES.includes(r.path), `${r.path}：※ 标记和设计稿不一致`);
  }
  for (const m of modules) check(navRoutesOf(m.key).length > 0, `模块"${m.name}"没有可直接进入的页面`);

  const cases: Array<[string, string, Record<string, string>]> = [
    ['#/customers/appointments', '/customers/appointments', {}],
    ['#/customers/KH-001', '/customers/:id', { id: 'KH-001' }],
    ['#/approvals/rules', '/approvals/rules', {}],
    ['#/orders/YW-2026-001', '/orders/:id', { id: 'YW-2026-001' }],
    ['#/inventory/batches/PC-004', '/inventory/batches/:id', { id: 'PC-004' }],
  ];
  for (const [hash, path, params] of cases) {
    const m = matchRoute(hash);
    check(m?.route.path === path && JSON.stringify(m.params) === JSON.stringify(params), `${hash} 应匹配 ${path}`);
  }
  for (const bad of ['', '#/', '#/nope', '#/customers/']) {
    check(matchRoute(bad) === null, `"${bad}" 不应匹配任何页面`);
  }

  const active = (hash: string) => {
    const m = matchRoute(hash);
    return m ? activeNavRoute(m)?.path : undefined;
  };
  check(active('#/customers/KH-001') === '/customers', '客户详情应高亮"客户列表"');
  check(active('#/customers/appointments') === '/customers/appointments', '预约页应高亮自己');
  check(active('#/inventory/batches/PC-001') === '/inventory/batches', '批次详情应高亮"原料批次"');

  check(href('/workbench') === '#/workbench', 'href 生成的工作台链接不对');
  check(detailHref('/customers/:id', 'KH-001') === '#/customers/KH-001', 'detailHref 生成的客户详情链接不对');
}
