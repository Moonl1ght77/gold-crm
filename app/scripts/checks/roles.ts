import { navModules } from '../../src/routes.ts';
import { canSee, roleGroups, roles } from '../../src/roles.ts';
import type { Check } from './types.ts';

/** 设计稿第 5 节：侧边栏和客户联系只对这五个岗位开放 */
const EXTERNAL = ['老板', '总经理', '品牌线上运营', '店长', '门店顾问'];

export function checkRoles(check: Check): void {
  check(roles.length === 16, `岗位应为 16 个，实际 ${roles.length} 个`);
  check(new Set(roles.map(r => r.id)).size === roles.length, '岗位编号重复');
  for (const g of roleGroups) check(roles.some(r => r.group === g), `岗位组"${g}"没有岗位`);

  for (const r of roles) {
    const keys = Object.keys(r.access);
    check(keys.every(k => k !== 'workbench' && navModules.some(m => m.key === k)), `${r.name}：可见模块里有无效项`);
    check(Object.values(r.access).includes('main'), `${r.name}：没有主模块`);
    check(r.tabs[0] !== r.tabs[1] && r.tabs.every(t => t !== 'workbench' && canSee(r, t)), `${r.name}：手机 Tab 必须是两个不同的可见模块`);
    check(Object.keys(r.scope ?? {}).every(k => keys.includes(k)), `${r.name}：范围说明指向了不可见的模块`);
  }

  const external = roles.filter(r => r.external).map(r => r.name);
  check(external.length === EXTERNAL.length && EXTERNAL.every(n => external.includes(n)), `面向客户的岗位应为 ${EXTERNAL.join('、')}`);

  for (const id of ['boss', 'gm']) {
    const r = roles.find(x => x.id === id);
    check(Boolean(r) && navModules.every(m => canSee(r!, m.key)) && r!.access.system === 'view', `${r?.name ?? id}：应全部可看，系统设置只看`);
  }
}
