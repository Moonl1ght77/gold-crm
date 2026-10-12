/**
 * 模块与路由表。纯 TS，检查脚本可以直接读；页面组件在 pages/registry.ts 按路径对应。
 * 页面里的内部链接一律用 href() / detailHref() 生成，不手写 "#/..."。
 */

export const modules = [
  { key: 'workbench', name: '工作台', short: '工作台' },
  { key: 'customers', name: '客户与跟进', short: '客户' },
  { key: 'orders', name: '业务单', short: '业务单' },
  { key: 'products', name: '商品与设计', short: '商品' },
  { key: 'inventory', name: '采购与库存', short: '库存' },
  { key: 'production', name: '生产与质检', short: '生产' },
  { key: 'finance', name: '财务', short: '财务' },
  { key: 'accounting', name: '会计税务', short: '会计' },
  { key: 'hr', name: '人事与提成', short: '人事' },
  { key: 'dashboard', name: '经营看板', short: '看板' },
  { key: 'miniapp', name: '小程序后台', short: '小程序' },
  { key: 'approvals', name: '审批中心', short: '审批' },
  { key: 'system', name: '系统设置', short: '系统' },
  { key: 'wecom', name: '企微形态', short: '企微' },
] as const;

export type ModuleKey = (typeof modules)[number]['key'];
export type AppModule = (typeof modules)[number];

/** 导航里的 13 个模块；企微形态从控制栏的"形态"进入，不进导航。 */
export const navModules: readonly AppModule[] = modules.filter(m => m.key !== 'wecom');

export interface PageNote {
  /** 这页做什么 */
  does: string;
  /** 对应图稿主题或设计稿来源 */
  source: string;
  /** 本页待商家核实的内容 */
  pending?: string;
}

export interface RouteDef {
  path: string;
  module: ModuleKey;
  title: string;
  note: PageNote;
  /** ※ 页：页面顶部整体标"待商家核实" */
  verify?: boolean;
}

const routeTable = [
  { path: '/workbench', module: 'workbench', title: '工作台', note: { does: '按当前岗位汇总我的交接、待办、待我审批、我发起的审批和本岗位关键数。', source: '图稿01 交接链；设计稿第 5 节' } },

  { path: '/customers', module: 'customers', title: '客户列表', note: { does: '门店和小程序客户共用一份档案，可按来源、顾问、阶段和会员标记筛选。', source: '图稿02·02 门店品牌线上销售', pending: '有没有会员体系（等级、积分、储值）' } },
  { path: '/customers/:id', module: 'customers', title: '客户详情', note: { does: '档案（含会员标记）、自定义字段、跟进、消费记录、业务单和企微绑定放在一页。', source: '图稿02·05 客户订单全链路' } },
  { path: '/customers/appointments', module: 'customers', title: '预约与跟进', note: { does: '今日预约、到店记录和下次跟进提醒。', source: '图稿01·01 需求登记' } },
  { path: '/customers/pool', module: 'customers', title: '公海与再分配', note: { does: '超期没跟进的客户回到公海，按规则再分配，并留分配日志。', source: '参考补充：企微 SCRM', pending: '回收期限与分配规则' } },
  { path: '/customers/live-codes', module: 'customers', title: '活码获客', note: { does: '门店柜台码、小程序码、活动码的扫码量与来源标签。', source: '参考补充：企微 SCRM' } },
  { path: '/customers/scripts', module: 'customers', title: '话术与素材', note: { does: '顾问常用话术、商品图文和活动素材，聊天侧边栏可直接取用。', source: '参考补充：企微 SCRM' } },
  { path: '/customers/forms', module: 'customers', title: '登记表与字段', note: { does: '客户登记表和自定义字段，例如手寸、偏好成色、纪念日。', source: '参考补充：企微 SCRM', pending: '实际要登记哪些字段' } },
  { path: '/customers/advisor-stats', module: 'customers', title: '顾问工作统计', note: { does: '每位顾问的新增客户、跟进次数、成交和转化。', source: '参考补充：企微 SCRM' } },

  { path: '/orders', module: 'orders', title: '业务单', note: { does: '全部业务单，可切换为 6 阶段看板。', source: '图稿01 六个阶段' } },
  { path: '/orders/:id', module: 'orders', title: '业务单详情', note: { does: '6 阶段进度、当前主责、记录链、报价版本、付款／生产／交付三个状态，以及按原料拆开的成本与毛利。', source: '图稿01；图稿02·05 客户订单全链路' } },
  { path: '/orders/after-sales', module: 'orders', title: '售后与取消', note: { does: '退货退款、维修和取消单，保留已发生的费用。', source: '图稿01·06 售后与复盘', pending: '退款与取消的结算口径' } },

  { path: '/products/series', module: 'products', title: '系列款式', note: { does: '全部系列和款式，带原料构成和目标成本。', source: '图稿02·01 产品与成本' } },
  { path: '/products/series/:id', module: 'products', title: '系列详情', note: { does: '系列的原料构成、各原料标准用量与成本占比、实际耗用汇总。', source: '图稿02·06 批次与复合商品数据', pending: '各系列实际用料与工费' } },
  { path: '/products/styles/:id', module: 'products', title: '款式详情', note: { does: '设计版本、标准用料表（原料、成色、用量、损耗率、单价）、工费和目标成本。', source: '图稿02·01 产品与成本' } },
  { path: '/products/changes', module: 'products', title: '设计变更', note: { does: '材料、尺寸或工艺变更时保留原版，登记新版本、原因和成本影响。', source: '图稿02·01 产品与成本' } },

  { path: '/inventory/materials', module: 'inventory', title: '原料目录', note: { does: '原料类别、成色、计量方式、参考单价与价源、标准损耗率；目前只列已知部分。', source: '图稿02·06 批次与复合商品数据', pending: '完整原料清单；16K、24K 的成色与标注' } },
  { path: '/inventory/suppliers', module: 'inventory', title: '供应商', note: { does: '供应商档案、供应的原料和往来概况。', source: '图稿02·03 供应链与工厂' } },
  { path: '/inventory/purchase-orders', module: 'inventory', title: '采购单', note: { does: '采购单的原料、数量、价格、到货和入库状态。', source: '图稿02·03 供应链与工厂' } },
  { path: '/inventory/batches', module: 'inventory', title: '原料批次', note: { does: '每个原料批次的来源、采购价和余量，可按原料类别筛选。', source: '图稿02·06 批次与复合商品数据' } },
  { path: '/inventory/batches/:id', module: 'inventory', title: '批次详情', note: { does: '按该原料的单位做平衡：成品耗用、余料、回收料、确认损耗、在制、待核对；宝石同时平衡粒数和重量。', source: '图稿02·07 经营看板与100g案例', pending: '损耗怎么确认、谁复核' } },
  { path: '/inventory/goods', module: 'inventory', title: '成品库存', note: { does: '按材料、纯度、主石、批次、库位、条码多级查询成品。', source: '参考补充：仓库与设备' } },
  { path: '/inventory/goods/:id', module: 'inventory', title: '成品详情', note: { does: '编号、总重、各原料净重、库位、锁定状态和实际用料。', source: '图稿02·06 批次与复合商品数据' } },
  { path: '/inventory/movements', module: 'inventory', title: '库存流水', note: { does: '领退料、调拨、盘点三类流水。', source: '参考补充：仓库与设备' } },
  { path: '/inventory/warehouse-screen', module: 'inventory', title: '仓库工作台大屏', note: { does: '仓库当天待入库、待出库、待锁定和调拨的大屏视图。', source: '参考补充：仓库与设备' } },
  { path: '/inventory/print-settings', module: 'inventory', title: '单据与标签打印设置', note: { does: '入库单、出库单和成品标签的打印模板与打印机。', source: '参考补充：仓库与设备', pending: '现有标签打印机型号' } },

  { path: '/production/schedule', module: 'production', title: '排产看板', note: { does: '按工序和交期排生产任务，显示占用和延期。', source: '10-11 新增：排产', pending: '工厂工序与产能' } },
  { path: '/production/capacity', module: 'production', title: '产能与工序', note: { does: '各工序的人手、日产能和当前占用。', source: '10-11 新增：排产', pending: '工厂工序与产能' } },
  { path: '/production/tasks', module: 'production', title: '生产任务', note: { does: '全部生产任务，可按状态和师傅筛选。', source: '图稿01·04 备货与生产' } },
  { path: '/production/tasks/:id', module: 'production', title: '任务详情', note: { does: '逐项原料的领退料与实际用量、和标准用量的差异、实际工费（含镶嵌、珐琅）、质检和返工。', source: '图稿02·03 供应链与工厂' } },
  { path: '/production/qc', module: 'production', title: '质检记录', note: { does: '质检结果、不合格原因、返工和复检。', source: '图稿01·05 质检与交付' } },

  { path: '/finance/reconcile', module: 'finance', title: '收退款核对', note: { does: '门店和小程序的收款、退款逐笔核对。', source: '图稿02·04 财务与资金' } },
  { path: '/finance/cost-margin', module: 'finance', title: '成本与毛利', note: { does: '按业务单和系列看成本与毛利，成本按原料类别和工费拆开。', source: '图稿02·04 财务与资金' } },
  { path: '/finance/deposits', module: 'finance', title: '定金与预存款', verify: true, note: { does: '定金和预存款的收取、使用和余额。', source: '参考补充：往来财务', pending: '有没有定金和预存款，规则怎样' } },
  { path: '/finance/accounts', module: 'finance', title: '往来对账', verify: true, note: { does: '客户、供应商、账期欠款三个页签。', source: '参考补充：往来财务', pending: '有没有批发或赊账，对账周期' } },
  { path: '/finance/statement-import', module: 'finance', title: '收款流水导入', verify: true, note: { does: '导入银行或支付平台流水，和系统收款对上。', source: '参考补充：往来财务', pending: '实际用哪些收款渠道' } },

  { path: '/accounting/vouchers', module: 'accounting', title: '凭证列表', note: { does: '由收款、采购、退款、工资推出的记账凭证。', source: '10-11 新增：会计税务', pending: '科目与记账口径' } },
  { path: '/accounting/vouchers/:id', module: 'accounting', title: '凭证详情', note: { does: '凭证分录、来源单据，以及制单人和复核人。', source: '10-11 新增：会计税务' } },
  { path: '/accounting/invoices', module: 'accounting', title: '发票', note: { does: '开票申请和已开发票。', source: '10-11 新增：会计税务', pending: '发票类型' } },
  { path: '/accounting/tax', module: 'accounting', title: '税务概览', verify: true, note: { does: '按模拟口径展示应交税额，未经会计核实。', source: '10-11 新增：会计税务', pending: '税务口径' } },

  { path: '/hr/employees', module: 'hr', title: '员工', note: { does: '员工档案、所属门店或部门、岗位与兼岗。', source: '10-11 新增：人事与提成', pending: '实际岗位与兼岗' } },
  { path: '/hr/attendance', module: 'hr', title: '考勤', note: { does: '出勤、迟到、请假和异常。', source: '10-11 新增：人事与提成' } },
  { path: '/hr/commission', module: 'hr', title: '提成与计件', note: { does: '顾问提成按已收款订单推算，工厂计件按已完成任务推算。', source: '10-11 新增：人事与提成', pending: '提成比例与计件单价' } },
  { path: '/hr/payroll', module: 'hr', title: '工资单', note: { does: '底薪、提成、计件、扣款合成工资单，人事初审后上转总经理。', source: '10-11 新增：人事与提成' } },

  { path: '/dashboard/overview', module: 'dashboard', title: '总览', note: { does: '销售、毛利、库存、在制和异常的总览，可下钻到原记录。', source: '图稿02·07 经营看板与100g案例' } },
  { path: '/dashboard/batches', module: 'dashboard', title: '原料批次总盘', note: { does: '按原料类别看各批次的原量、在库、在制、损耗和待核对。', source: '图稿02·07 经营看板与100g案例' } },
  { path: '/dashboard/series-orders', module: 'dashboard', title: '系列与订单总盘', note: { does: '各系列的销量、毛利、原料耗用与成本结构。', source: '图稿02·07 经营看板与100g案例' } },
  { path: '/dashboard/stores', module: 'dashboard', title: '门店对比', note: { does: '城东店、城西店、小程序商城的销售和毛利对比。', source: '10-11 新增：多门店' } },
  { path: '/dashboard/anomalies', module: 'dashboard', title: '异常下钻', note: { does: '材料差异、超目标成本、毛利变化和延期，逐条追到原记录。', source: '图稿02·07 经营看板与100g案例', pending: '异常阈值与责任人' } },
  { path: '/dashboard/reports', module: 'dashboard', title: '报表中心', note: { does: '销售、仓库、财务、生产四类报表。', source: '参考补充：报表中心' } },

  { path: '/miniapp/realtime', module: 'miniapp', title: '实时数据', note: { does: '访客、预约、订单、支付指标和滚动事件流；事件流只在演示里播放，不写入数据。', source: '10-11 新增：小程序后台', pending: '小程序搭建平台与开放接口' } },
  { path: '/miniapp/order-chain', module: 'miniapp', title: '订单链路', note: { does: '小程序订单 → 客户 → 业务单 → 生产或交付 → 收款，每一环都能点进去。', source: '10-11 新增：小程序后台' } },
  { path: '/miniapp/sync-log', module: 'miniapp', title: '同步记录', note: { does: '同步成功、失败重试和重复推送被识别的记录。', source: '10-11 新增：小程序后台' } },
  { path: '/miniapp/campaigns', module: 'miniapp', title: '活动与内容', note: { does: '小程序活动和内容，旧营销中心并到这里。', source: '10-11 新增：小程序后台' } },

  { path: '/approvals', module: 'approvals', title: '审批列表', note: { does: '待我审批、我发起的和全部审批。', source: '设计稿第 5 节审批规则' } },
  { path: '/approvals/:id', module: 'approvals', title: '审批详情', note: { does: '审批链、每一级的意见和关联的原业务单。', source: '设计稿第 5 节审批规则' } },
  { path: '/approvals/rules', module: 'approvals', title: '审批规则', note: { does: '各事项的初审人和逐级上转阈值，阈值是虚拟值。', source: '设计稿第 5 节审批规则', pending: '审批阈值' } },

  { path: '/system/permissions', module: 'system', title: '岗位权限矩阵', note: { does: '16 个岗位对 13 个模块的主用与只看。', source: '设计稿第 5 节岗位与可见范围', pending: '实际岗位权限' } },
  { path: '/system/accounts', module: 'system', title: '账号', note: { does: '员工账号、所属岗位和企微成员绑定。', source: '10-11 新增：企微入口' } },
  { path: '/system/wecom', module: 'system', title: '企微配置', note: { does: '企业微信应用、通讯录同步和消息推送配置（模拟）。', source: '10-11 新增：企微入口', pending: '是否已在用企业微信，管理员是谁' } },
  { path: '/system/miniapp', module: 'system', title: '小程序配置', note: { does: '小程序后台的对接方式和同步设置（模拟）。', source: '10-11 新增：小程序后台', pending: '小程序平台、后台归属与支付模式' } },
  { path: '/system/devices', module: 'system', title: '设备绑定', note: { does: '电子秤、扫码枪、标签打印机的绑定状态。', source: '参考补充：仓库与设备', pending: '现有设备型号' } },
  { path: '/system/ai', module: 'system', title: 'AI 接入', note: { does: '接口地址、密钥掩码、可用模型、额度与用量、调用日志，为以后接入自有中转站预留（模拟）。', source: '10-11 Joe 新增', pending: '商家想用 AI 做什么' } },
  { path: '/system/logs', module: 'system', title: '操作日志', note: { does: '关键操作的经办人、时间和内容。', source: '图稿02·08 MVP范围与验收' } },

  { path: '/wecom/sidebar', module: 'wecom', title: '聊天侧边栏', note: { does: '模拟和客户聊天，右侧显示客户档案、进行中业务单、报价版本、话术、素材和快捷跟进。', source: '10-11 新增：企微形态' } },
  { path: '/wecom/messages', module: 'wecom', title: '消息通知', note: { does: '企微应用消息卡片，点开直达对应记录。', source: '10-11 新增：企微形态' } },
  { path: '/wecom/contacts', module: 'wecom', title: '客户联系', note: { does: '外部联系人与客户编号的绑定、来源活码、跟进顾问和离职继承示例。', source: '10-11 新增：企微形态' } },
] as const satisfies readonly RouteDef[];

export type RoutePath = (typeof routeTable)[number]['path'];
export interface AppRoute extends RouteDef {
  path: RoutePath;
}
export const routes: readonly AppRoute[] = routeTable;

export interface RouteMatch {
  route: AppRoute;
  params: Record<string, string>;
}

type StaticPath = Exclude<RoutePath, `${string}:${string}`>;
type DetailPath = Extract<RoutePath, `${string}/:id`>;

/** 列表页等不带参数的页面：href('/workbench') → '#/workbench'。 */
export function href(path: StaticPath): string {
  return '#' + path;
}

/** 详情页：detailHref('/customers/:id', 'KH-001') → '#/customers/KH-001'。 */
export function detailHref(path: DetailPath, id: string): string {
  return '#' + path.replace(':id', encodeURIComponent(id));
}

/** 把地址栏的 hash 匹配到路由；静态路径优先于详情页（/customers/pool 不会被当成客户详情）。 */
export function matchRoute(hash: string): RouteMatch | null {
  const path = hash.replace(/^#/, '').split('?')[0];
  let best: RouteMatch | null = null;
  for (const route of routes) {
    const params = matchPath(route.path, path);
    if (params && (!best || Object.keys(params).length < Object.keys(best.params).length)) {
      best = { route, params };
    }
  }
  return best;
}

function matchPath(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split('/');
  const got = path.split('/');
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(':')) {
      if (!got[i]) return null;
      try {
        params[want[i].slice(1)] = decodeURIComponent(got[i]);
      } catch {
        return null;
      }
    } else if (want[i] !== got[i]) {
      return null;
    }
  }
  return params;
}

export function moduleOf(key: ModuleKey): AppModule {
  return modules.find(m => m.key === key)!;
}

/** 模块里能直接进入的页面（不含详情页），顺序即导航顺序。 */
export function navRoutesOf(module: ModuleKey): AppRoute[] {
  return routes.filter(r => r.module === module && !r.path.includes(':'));
}

export function navHref(route: AppRoute): string {
  return '#' + route.path;
}

export function landingHref(module: ModuleKey): string {
  return navHref(navRoutesOf(module)[0]);
}

/** 当前页在本模块导航里应高亮哪一项：详情页高亮它所属的列表页。 */
export function activeNavRoute(match: RouteMatch): AppRoute | undefined {
  const current = match.route.path;
  return navRoutesOf(match.route.module)
    .filter(r => current === r.path || current.startsWith(r.path + '/'))
    .sort((a, b) => b.path.length - a.path.length)[0];
}
