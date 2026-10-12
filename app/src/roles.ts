import { navModules } from './routes.ts';
import type { ModuleKey } from './routes.ts';

export const roleGroups = ['管理层', '销售与门店', '产品与设计', '供应链与工厂', '财务', '人事与系统'] as const;
export type RoleGroup = (typeof roleGroups)[number];

/** main＝主要工作区，view＝只读 */
export type Access = 'main' | 'view';

export interface Role {
  id: string;
  name: string;
  group: RoleGroup;
  /** 工作台重点 */
  focus: readonly string[];
  /** 可见模块；工作台人人可见，不写在这里 */
  access: Partial<Record<ModuleKey, Access>>;
  /** 设计稿第 5 节括号里的范围，页面顶部显示 */
  scope?: Partial<Record<ModuleKey, string>>;
  /** 手机底部除"工作台""我的"之外的两个 Tab */
  tabs: readonly [ModuleKey, ModuleKey];
  /** 面向客户：可用聊天侧边栏和客户联系 */
  external: boolean;
}

/** 老板、总经理：全部可看（系统设置只看，2026-10-11 Joe 定），main 里列的是主要工作区 */
function allModules(main: readonly ModuleKey[]): Partial<Record<ModuleKey, Access>> {
  const access: Partial<Record<ModuleKey, Access>> = {};
  for (const m of navModules) {
    if (m.key !== 'workbench') access[m.key] = main.includes(m.key) ? 'main' : 'view';
  }
  return access;
}

/** 设计稿第 5 节岗位表 */
const roleList = [
  { id: 'boss', name: '老板', group: '管理层', focus: ['超总经理额度的审批', '经营摘要', '重大异常'], access: allModules(['dashboard', 'approvals']), tabs: ['dashboard', 'approvals'], external: true },
  { id: 'gm', name: '总经理', group: '管理层', focus: ['待我审批', '跨部门延期与异常', '交接总览'], access: allModules(['approvals']), tabs: ['approvals', 'dashboard'], external: true },
  { id: 'online-ops', name: '品牌线上运营', group: '销售与门店', focus: ['小程序新线索', '活码数据', '待发素材'], access: { miniapp: 'main', customers: 'main', products: 'view', dashboard: 'view' }, scope: { customers: '活码、话术素材、登记表' }, tabs: ['miniapp', 'customers'], external: true },
  { id: 'store-manager', name: '店长', group: '销售与门店', focus: ['待分配客户', '店长额度内的审批', '本店延期'], access: { customers: 'main', orders: 'main', inventory: 'main', approvals: 'main', dashboard: 'view', hr: 'view' }, scope: { customers: '公海分配', inventory: '本店、调拨', dashboard: '本店', hr: '本店' }, tabs: ['customers', 'orders'], external: true },
  { id: 'advisor', name: '门店顾问', group: '销售与门店', focus: ['待跟进客户', '我的交接', '今日预约'], access: { customers: 'main', orders: 'main', products: 'view', inventory: 'view' }, scope: { inventory: '可售成品' }, tabs: ['customers', 'orders'], external: true },
  { id: 'product-owner', name: '产品负责人', group: '产品与设计', focus: ['待评估需求', '超出目标成本'], access: { products: 'main', orders: 'view', dashboard: 'view', inventory: 'view' }, scope: { dashboard: '系列' }, tabs: ['products', 'orders'], external: false },
  { id: 'designer', name: '珠宝设计师', group: '产品与设计', focus: ['待出设计版本', '待确认变更'], access: { products: 'main', orders: 'view' }, scope: { orders: '定制单' }, tabs: ['products', 'orders'], external: false },
  { id: 'purchaser', name: '采购', group: '供应链与工厂', focus: ['缺料待采购', '待入库'], access: { inventory: 'main', finance: 'view' }, scope: { inventory: '原料目录、供应商、采购单、批次', finance: '供应商往来' }, tabs: ['inventory', 'finance'], external: false },
  { id: 'warehouse', name: '仓库', group: '供应链与工厂', focus: ['待入库', '待锁定', '待出库', '调拨'], access: { inventory: 'main', orders: 'view', production: 'view', system: 'view' }, scope: { production: '领料', system: '设备' }, tabs: ['inventory', 'orders'], external: false },
  { id: 'production-lead', name: '生产主管', group: '供应链与工厂', focus: ['待排产', '产能占用', '损耗待审'], access: { production: 'main', approvals: 'main', inventory: 'view' }, scope: { approvals: '损耗' }, tabs: ['production', 'approvals'], external: false },
  { id: 'craftsman', name: '工厂师傅', group: '供应链与工厂', focus: ['我的任务', '待领料', '本人计件'], access: { production: 'main', hr: 'view' }, scope: { production: '我的任务', hr: '本人计件' }, tabs: ['production', 'hr'], external: false },
  { id: 'qc', name: '质检', group: '供应链与工厂', focus: ['待质检', '待复检'], access: { production: 'main', orders: 'view' }, scope: { production: '质检' }, tabs: ['production', 'orders'], external: false },
  { id: 'cashier', name: '出纳／财务', group: '财务', focus: ['待核对收退款', '成本复核', '退款审批'], access: { finance: 'main', approvals: 'main', orders: 'view', accounting: 'view' }, scope: { approvals: '退款、凭证复核' }, tabs: ['finance', 'approvals'], external: false },
  { id: 'accountant', name: '会计', group: '财务', focus: ['待制凭证', '发票', '税务'], access: { accounting: 'main', finance: 'view' }, tabs: ['accounting', 'finance'], external: false },
  { id: 'hr-admin', name: '人事行政', group: '人事与系统', focus: ['考勤异常', '提成计件待核', '工资单'], access: { hr: 'main', approvals: 'main', system: 'view' }, scope: { approvals: '工资单初审', system: '账号' }, tabs: ['hr', 'approvals'], external: false },
  { id: 'sysadmin', name: '系统管理员', group: '人事与系统', focus: ['企微和小程序同步状态', '设备'], access: { system: 'main', miniapp: 'view' }, scope: { miniapp: '同步记录' }, tabs: ['system', 'miniapp'], external: false },
] as const satisfies readonly Role[];

export type RoleId = (typeof roleList)[number]['id'];
export type AppRole = Role & { id: RoleId };
export const roles: readonly AppRole[] = roleList;
export const DEFAULT_ROLE_ID: RoleId = 'boss';

export function roleById(id: string): AppRole | undefined {
  return roles.find(r => r.id === id);
}

/** 工作台和企微形态人人可进；企微里的客户形态另由 Screen 按 external 拦。 */
export function canSee(role: Role, module: ModuleKey): boolean {
  return module === 'workbench' || module === 'wecom' || role.access[module] !== undefined;
}

export function visibleModules(role: Role) {
  return navModules.filter(m => canSee(role, m.key));
}
