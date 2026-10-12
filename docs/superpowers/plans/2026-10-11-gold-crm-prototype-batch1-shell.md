# 黄金CRM 点击原型 · 第 1 批：外壳骨架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `app/` 搭出能切 16 个岗位、手机／桌面两种视图、深／浅两套主题的演示外壳；67 页先以占位页出现，导航和可见范围与设计稿第 5 节一致。

**Architecture:** Vite + React 19 单页应用，约 30 行的 hash 路由。路由表 `src/routes.ts` 和岗位表 `src/roles.ts` 是纯 TS，`scripts/check.ts` 用 Node 直接运行它们做检查；页面组件另在 `src/pages/registry.ts` 按路径登记，没登记的显示占位页。外壳分控制栏、手机框、桌面框、页面说明四块，样式全部是 CSS 变量，两套主题各一组值。桌面视图右侧的详情抽屉随第 2 批的通用组件一起做，本批不做。

**Tech Stack:** React 19.3、TypeScript 5.9、Vite 8.3、@vitejs/plugin-react 6.1（与 `demo/` 同版本）；Node 22.6 以上运行检查脚本（本机 24.15.0）。不引组件库和路由库。

依据：设计稿 `docs/superpowers/specs/2026-10-11-gold-crm-clickable-prototype-design.md`；路线图 `docs/superpowers/plans/2026-10-11-gold-crm-prototype-roadmap.md`。

---

## 约定

- 命令都在仓库根目录 `E:\Projects\黄金CRM` 执行，用 `npm --prefix app …` 进入应用目录。
- 提交信息末尾按当前会话要求加署名行。
- 不改 `demo/`；不提交 `demo/preview.*.log` 和 `黄金CRM-业务与范围-v0.1.prg`。
- 检查脚本就是本项目的测试（设计稿第 11 节：检查脚本以外的测试不做）。有逻辑的部分先写检查、看它失败，再写实现。

## 文件结构

| 文件 | 职责 |
|---|---|
| `app/package.json`、`app/tsconfig.json`、`app/vite.config.ts`、`app/index.html` | 脚手架；开发端口 5174，避开 demo 的 5173 |
| `app/src/routes.ts` | 14 个模块、67 页路由表（标题、说明、※ 标记）、`href()`／`detailHref()`、`matchRoute()`、导航辅助函数 |
| `app/src/roles.ts` | 6 个岗位组、16 个岗位、可见模块（主／看）、范围说明、手机 Tab、是否面向客户 |
| `app/src/shell/prefs.ts` | 身份、视图、主题的读取校验与保存，读写失败退回默认 |
| `app/src/shell/hooks.ts` | `useHashRoute()`、`useMediaQuery()` |
| `app/src/shell/ShellContext.ts` | 当前岗位和视图的上下文 |
| `app/src/shell/Screen.tsx` | 路由 → 页面／占位页／无权限提示 |
| `app/src/shell/ModuleTabs.tsx` | 手机视图的模块内页面切换条 |
| `app/src/shell/ControlBar.tsx` | 演示控制栏 |
| `app/src/shell/PhoneFrame.tsx` | 390×844 手机框、底部 Tab、"我的"应用宫格 |
| `app/src/shell/DesktopFrame.tsx` | 企微桌面端式布局：模块侧栏 + 主区 |
| `app/src/shell/NotesPanel.tsx` | 页面说明 |
| `app/src/pages/registry.ts` | 路径 → 页面组件登记表（本批为空） |
| `app/src/pages/Placeholder.tsx` | 占位页 |
| `app/src/styles/tokens.css` | 深、浅两套颜色变量 |
| `app/src/styles/shell.css` | 外壳布局与通用样式 |
| `app/src/App.tsx`、`app/src/main.tsx` | 组装与挂载 |
| `app/scripts/check.ts`、`app/scripts/checks/*.ts` | `npm run check`：路由、岗位、偏好、链接四组检查 |
| `.claude/launch.json` | 浏览器面板启动开发服务器的配置 |
| `.gitignore` | 忽略 `app/node_modules/`、`app/dist/` |

---

### Task 1: 脚手架

**Files:**
- Create: `app/package.json`
- Create: `app/tsconfig.json`
- Create: `app/vite.config.ts`
- Create: `app/index.html`
- Create: `app/src/main.tsx`（临时内容，Task 6 替换）
- Create: `.claude/launch.json`
- Modify: `.gitignore`（末尾追加两行）

- [ ] **Step 1: 写 `app/package.json`**

```json
{
  "name": "gold-crm-prototype",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=22.6"
  },
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "check": "node --experimental-strip-types scripts/check.ts",
    "preview": "vite preview --host 127.0.0.1"
  },
  "dependencies": {
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.2",
    "typescript": "^5.9.0",
    "vite": "^8.3.4"
  }
}
```

- [ ] **Step 2: 写 `app/tsconfig.json`**

`verbatimModuleSyntax` 强制类型导入写成 `import type`，`erasableSyntaxOnly` 禁用枚举等语法——这两项保证 Node 能直接运行检查脚本。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

- [ ] **Step 3: 写 `app/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
});
```

- [ ] **Step 4: 写 `app/index.html`**

```html
<!doctype html>
<html lang="zh-CN" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>黄金CRM · 全公司点击原型</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: 写临时的 `app/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <p>黄金CRM 全公司点击原型：脚手架就绪</p>
  </StrictMode>,
);
```

- [ ] **Step 6: 写 `.claude/launch.json`**

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "gold-crm-app",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["--prefix", "app", "run", "dev"],
      "port": 5174
    }
  ]
}
```

- [ ] **Step 7: `.gitignore` 末尾追加**

```
app/node_modules/
app/dist/
```

- [ ] **Step 8: 安装依赖并构建**

Run: `npm --prefix app install`
Expected: 生成 `app/package-lock.json`，无 `ERR!`。

Run: `npm --prefix app run build`
Expected: tsc 无输出，Vite 打印 `✓ built in …`，生成 `app/dist/`。

- [ ] **Step 9: 提交**

```bash
git add app/package.json app/package-lock.json app/tsconfig.json app/vite.config.ts app/index.html app/src/main.tsx .claude/launch.json .gitignore
git commit -m "feat(app): scaffold clickable prototype app"
```

---

### Task 2: 路由表与路由检查

**Files:**
- Create: `app/scripts/checks/types.ts`
- Create: `app/scripts/checks/routes.ts`
- Create: `app/scripts/check.ts`
- Create: `app/src/routes.ts`

- [ ] **Step 1: 写检查的类型 `app/scripts/checks/types.ts`**

```ts
/** 记一条检查：ok 为 false 时把 message 记为失败。 */
export type Check = (ok: boolean, message: string) => void;
```

- [ ] **Step 2: 写路由检查 `app/scripts/checks/routes.ts`**

```ts
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
```

- [ ] **Step 3: 写检查入口 `app/scripts/check.ts`（本步只接路由一组）**

```ts
import { checkRoutes } from './checks/routes.ts';
import type { Check } from './checks/types.ts';

const sections: Array<[string, (check: Check) => void]> = [['路由', checkRoutes]];

const failures: string[] = [];
for (const [, run] of sections) {
  run((ok, message) => {
    if (!ok) failures.push(message);
  });
}

if (failures.length > 0) {
  console.error(`检查未通过（${failures.length} 项）：\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`检查通过：${sections.map(([name]) => name).join('、')}。`);
```

- [ ] **Step 4: 运行检查，确认失败**

Run: `npm --prefix app run check`
Expected: FAIL，`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…\app\src\routes.ts'`。

- [ ] **Step 5: 写 `app/src/routes.ts`**

```ts
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
```

- [ ] **Step 6: 运行检查，确认通过**

Run: `npm --prefix app run check`
Expected: `检查通过：路由。`

- [ ] **Step 7: 类型检查**

Run: `npm --prefix app run build`
Expected: 通过，无类型错误。

- [ ] **Step 8: 提交**

```bash
git add app/src/routes.ts app/scripts/check.ts app/scripts/checks/types.ts app/scripts/checks/routes.ts
git commit -m "feat(app): add 67-page route table with route checks"
```

---

### Task 3: 岗位与可见范围

**Files:**
- Create: `app/scripts/checks/roles.ts`
- Modify: `app/scripts/check.ts`
- Create: `app/src/roles.ts`

- [ ] **Step 1: 写岗位检查 `app/scripts/checks/roles.ts`**

```ts
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
    check(Boolean(r) && navModules.every(m => canSee(r!, m.key) === (m.key !== 'system')), `${r?.name ?? id}：应除系统设置外全部可看`);
  }
}
```

- [ ] **Step 2: 检查入口接上岗位组 `app/scripts/check.ts`**

```ts
import { checkRoles } from './checks/roles.ts';
import { checkRoutes } from './checks/routes.ts';
import type { Check } from './checks/types.ts';

const sections: Array<[string, (check: Check) => void]> = [
  ['路由', checkRoutes],
  ['岗位', checkRoles],
];

const failures: string[] = [];
for (const [, run] of sections) {
  run((ok, message) => {
    if (!ok) failures.push(message);
  });
}

if (failures.length > 0) {
  console.error(`检查未通过（${failures.length} 项）：\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`检查通过：${sections.map(([name]) => name).join('、')}。`);
```

- [ ] **Step 3: 运行检查，确认失败**

Run: `npm --prefix app run check`
Expected: FAIL，`ERR_MODULE_NOT_FOUND`，找不到 `src/roles.ts`。

- [ ] **Step 4: 写 `app/src/roles.ts`**

```ts
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

/** 老板、总经理：除系统设置外全部可看，main 里列的是主要工作区 */
function allButSystem(main: readonly ModuleKey[]): Partial<Record<ModuleKey, Access>> {
  const access: Partial<Record<ModuleKey, Access>> = {};
  for (const m of navModules) {
    if (m.key !== 'workbench' && m.key !== 'system') access[m.key] = main.includes(m.key) ? 'main' : 'view';
  }
  return access;
}

/** 设计稿第 5 节岗位表 */
const roleList = [
  { id: 'boss', name: '老板', group: '管理层', focus: ['超总经理额度的审批', '经营摘要', '重大异常'], access: allButSystem(['dashboard', 'approvals']), tabs: ['dashboard', 'approvals'], external: true },
  { id: 'gm', name: '总经理', group: '管理层', focus: ['待我审批', '跨部门延期与异常', '交接总览'], access: allButSystem(['approvals']), tabs: ['approvals', 'dashboard'], external: true },
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
```

- [ ] **Step 5: 运行检查，确认通过**

Run: `npm --prefix app run check`
Expected: `检查通过：路由、岗位。`

- [ ] **Step 6: 类型检查**

Run: `npm --prefix app run build`
Expected: 通过。

- [ ] **Step 7: 提交**

```bash
git add app/src/roles.ts app/scripts/check.ts app/scripts/checks/roles.ts
git commit -m "feat(app): add 16 roles with module visibility"
```

---

### Task 4: 偏好保存与路由钩子

**Files:**
- Create: `app/scripts/checks/prefs.ts`
- Modify: `app/scripts/check.ts`
- Create: `app/src/shell/prefs.ts`
- Create: `app/src/shell/hooks.ts`

- [ ] **Step 1: 写偏好检查 `app/scripts/checks/prefs.ts`**

```ts
import { DEFAULT_PREFS, parsePrefs } from '../../src/shell/prefs.ts';
import type { Check } from './types.ts';

export function checkPrefs(check: Check): void {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  check(same(parsePrefs(null), DEFAULT_PREFS), '存储为空时应退回默认偏好');
  check(same(parsePrefs('{坏数据'), DEFAULT_PREFS), '存储内容损坏时应退回默认偏好');
  check(same(parsePrefs('"字符串"'), DEFAULT_PREFS), '存储内容不是对象时应退回默认偏好');
  check(
    same(parsePrefs(JSON.stringify({ roleId: 'advisor', view: 'desktop', theme: 'light' })), { roleId: 'advisor', view: 'desktop', theme: 'light' }),
    '有效偏好应原样读回',
  );
  check(same(parsePrefs(JSON.stringify({ roleId: 'ghost', view: 'tv', theme: 'pink' })), DEFAULT_PREFS), '无效字段应逐项退回默认');
  check(same(parsePrefs(JSON.stringify({ roleId: 'qc' })), { ...DEFAULT_PREFS, roleId: 'qc' }), '缺少的字段应补默认值');
}
```

- [ ] **Step 2: 检查入口接上偏好组 `app/scripts/check.ts`**

```ts
import { checkPrefs } from './checks/prefs.ts';
import { checkRoles } from './checks/roles.ts';
import { checkRoutes } from './checks/routes.ts';
import type { Check } from './checks/types.ts';

const sections: Array<[string, (check: Check) => void]> = [
  ['路由', checkRoutes],
  ['岗位', checkRoles],
  ['偏好', checkPrefs],
];

const failures: string[] = [];
for (const [, run] of sections) {
  run((ok, message) => {
    if (!ok) failures.push(message);
  });
}

if (failures.length > 0) {
  console.error(`检查未通过（${failures.length} 项）：\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`检查通过：${sections.map(([name]) => name).join('、')}。`);
```

- [ ] **Step 3: 运行检查，确认失败**

Run: `npm --prefix app run check`
Expected: FAIL，`ERR_MODULE_NOT_FOUND`，找不到 `src/shell/prefs.ts`。

- [ ] **Step 4: 写 `app/src/shell/prefs.ts`**

```ts
import { DEFAULT_ROLE_ID, roleById } from '../roles.ts';
import type { RoleId } from '../roles.ts';

export type ViewMode = 'phone' | 'desktop';
export type Theme = 'dark' | 'light';

/** 设计稿第 3 节：身份、视图、主题存在本机浏览器 */
export interface Prefs {
  roleId: RoleId;
  view: ViewMode;
  theme: Theme;
}

export const DEFAULT_PREFS: Prefs = { roleId: DEFAULT_ROLE_ID, view: 'phone', theme: 'dark' };

const KEY = 'gold-crm-prototype:prefs';

/** 逐项校验；坏数据、旧版本或未知值都退回默认，不让存储里的旧值卡住页面。 */
export function parsePrefs(raw: string | null): Prefs {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
  } catch {
    // 存储内容损坏，按默认处理
  }
  const role = typeof data.roleId === 'string' ? roleById(data.roleId) : undefined;
  return {
    roleId: role ? role.id : DEFAULT_PREFS.roleId,
    view: data.view === 'phone' || data.view === 'desktop' ? data.view : DEFAULT_PREFS.view,
    theme: data.theme === 'dark' || data.theme === 'light' ? data.theme : DEFAULT_PREFS.theme,
  };
}

export function loadPrefs(): Prefs {
  try {
    return parsePrefs(window.localStorage.getItem(KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // 隐私模式等写不进去时，只在本次打开期间生效
  }
}
```

- [ ] **Step 5: 运行检查，确认通过**

Run: `npm --prefix app run check`
Expected: `检查通过：路由、岗位、偏好。`

- [ ] **Step 6: 写 `app/src/shell/hooks.ts`**

```ts
import { useEffect, useMemo, useState } from 'react';
import { matchRoute } from '../routes.ts';
import type { RouteMatch } from '../routes.ts';

/** hash 路由：监听地址栏变化，返回匹配到的页面；匹配不到返回 null。 */
export function useHashRoute(): RouteMatch | null {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  return useMemo(() => matchRoute(hash), [hash]);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);
    sync();
    list.addEventListener('change', sync);
    return () => list.removeEventListener('change', sync);
  }, [query]);
  return matches;
}
```

- [ ] **Step 7: 类型检查**

Run: `npm --prefix app run build`
Expected: 通过。

- [ ] **Step 8: 提交**

```bash
git add app/src/shell/prefs.ts app/src/shell/hooks.ts app/scripts/check.ts app/scripts/checks/prefs.ts
git commit -m "feat(app): add persisted prefs and hash route hooks"
```

---

### Task 5: 页面解析、占位页和链接规则

**Files:**
- Create: `app/scripts/checks/links.ts`
- Modify: `app/scripts/check.ts`
- Create: `app/src/shell/ShellContext.ts`
- Create: `app/src/pages/registry.ts`
- Create: `app/src/pages/Placeholder.tsx`
- Create: `app/src/shell/Screen.tsx`
- Create: `app/src/shell/ModuleTabs.tsx`

- [ ] **Step 1: 写链接规则检查 `app/scripts/checks/links.ts`**

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Check } from './types.ts';

/**
 * 设计稿第 10 节第 6 条：内部链接要对得上路由表。规则是不手写 "#/..."，一律用 href()／detailHref()，路径写错时编译就报错。
 * routes.ts 是唯一生成链接的地方，不在扫描范围内。
 */
export function checkLinks(check: Check): void {
  const root = fileURLToPath(new URL('../../src', import.meta.url));
  const routesFile = join(root, 'routes.ts');
  const offenders: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name) && full !== routesFile && /["'`]#\//.test(readFileSync(full, 'utf8'))) offenders.push(full);
    }
  };
  walk(root);
  check(offenders.length === 0, `这些文件手写了 "#/..." 链接，应改用 href()／detailHref()：${offenders.join('，')}`);
}
```

- [ ] **Step 2: 检查入口接上链接组 `app/scripts/check.ts`**

```ts
import { checkLinks } from './checks/links.ts';
import { checkPrefs } from './checks/prefs.ts';
import { checkRoles } from './checks/roles.ts';
import { checkRoutes } from './checks/routes.ts';
import type { Check } from './checks/types.ts';

const sections: Array<[string, (check: Check) => void]> = [
  ['路由', checkRoutes],
  ['岗位', checkRoles],
  ['偏好', checkPrefs],
  ['链接', checkLinks],
];

const failures: string[] = [];
for (const [, run] of sections) {
  run((ok, message) => {
    if (!ok) failures.push(message);
  });
}

if (failures.length > 0) {
  console.error(`检查未通过（${failures.length} 项）：\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`检查通过：${sections.map(([name]) => name).join('、')}。`);
```

- [ ] **Step 3: 确认链接规则会拦**

临时新建 `app/src/pages/Probe.tsx`，内容为 `export const probe = <a href="#/workbench">x</a>;`。

Run: `npm --prefix app run check`
Expected: FAIL，`这些文件手写了 "#/..." 链接…Probe.tsx`。

删除 `app/src/pages/Probe.tsx`，再运行：
Expected: `检查通过：路由、岗位、偏好、链接。`

- [ ] **Step 4: 写 `app/src/shell/ShellContext.ts`**

```ts
import { createContext, useContext } from 'react';
import type { AppRole } from '../roles.ts';
import type { ViewMode } from './prefs.ts';

export interface Shell {
  role: AppRole;
  view: ViewMode;
}

export const ShellContext = createContext<Shell | null>(null);

export function useShell(): Shell {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error('useShell 必须在 ShellContext 里使用');
  return shell;
}
```

- [ ] **Step 5: 写 `app/src/pages/registry.ts`**

```ts
import type { ComponentType } from 'react';
import type { RoutePath } from '../routes.ts';

export interface PageProps {
  params: Record<string, string>;
}

/**
 * 路径 → 页面组件。还没实现的页面不登记，Screen 显示占位页。
 * 第 7 批收尾时改成 Record<RoutePath, …>，漏登记就编译失败。
 */
export const pages: Partial<Record<RoutePath, ComponentType<PageProps>>> = {};
```

- [ ] **Step 6: 写 `app/src/pages/Placeholder.tsx`**

```tsx
import { moduleOf } from '../routes.ts';
import type { AppRoute } from '../routes.ts';

export function Placeholder({ route }: { route: AppRoute }) {
  return (
    <section className="placeholder">
      <p className="eyebrow">{moduleOf(route.module).name}</p>
      <h2>{route.title}</h2>
      <p>{route.note.does}</p>
      <p className="muted">这一页还在搭建，按实施计划分批补上。</p>
    </section>
  );
}
```

- [ ] **Step 7: 写 `app/src/shell/Screen.tsx`**

```tsx
import { href } from '../routes.ts';
import type { RouteMatch } from '../routes.ts';
import { canSee } from '../roles.ts';
import { Placeholder } from '../pages/Placeholder.tsx';
import { pages } from '../pages/registry.ts';
import { useShell } from './ShellContext.ts';

const EXTERNAL_ONLY: readonly string[] = ['/wecom/sidebar', '/wecom/contacts'];

/** 当前路由 → 页面；顺带处理岗位看不到的模块、非客户岗位进企微客户形态两种情况。 */
export function Screen({ match }: { match: RouteMatch }) {
  const { role } = useShell();
  const { route, params } = match;
  if (!canSee(role, route.module)) {
    return <Notice title="本岗位看不到这个模块" text={`${role.name}的导航里没有这个入口。`} />;
  }
  if (EXTERNAL_ONLY.includes(route.path) && !role.external) {
    return <Notice title="本岗位无外部客户" text="聊天侧边栏和客户联系只对老板、总经理、品牌线上运营、店长、门店顾问开放。" />;
  }
  const Page = pages[route.path];
  const scope = role.scope?.[route.module];
  return (
    <>
      {scope && <p className="scope-line">本岗位范围：{scope}</p>}
      {route.verify && <p className="verify-banner">※ 本页待商家核实</p>}
      {Page ? <Page params={params} /> : <Placeholder route={route} />}
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
```

- [ ] **Step 8: 写 `app/src/shell/ModuleTabs.tsx`**

```tsx
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
```

- [ ] **Step 9: 检查与类型检查**

Run: `npm --prefix app run check`
Expected: `检查通过：路由、岗位、偏好、链接。`

Run: `npm --prefix app run build`
Expected: 通过。

- [ ] **Step 10: 提交**

```bash
git add app/scripts/check.ts app/scripts/checks/links.ts app/src/shell/ShellContext.ts app/src/shell/Screen.tsx app/src/shell/ModuleTabs.tsx app/src/pages/registry.ts app/src/pages/Placeholder.tsx
git commit -m "feat(app): add screen resolver, placeholders and link rule"
```

---

### Task 6: 样式与外壳组装

**Files:**
- Create: `app/src/styles/tokens.css`
- Create: `app/src/styles/shell.css`
- Create: `app/src/shell/ControlBar.tsx`
- Create: `app/src/shell/PhoneFrame.tsx`
- Create: `app/src/shell/DesktopFrame.tsx`
- Create: `app/src/shell/NotesPanel.tsx`
- Create: `app/src/App.tsx`
- Modify: `app/src/main.tsx`（整体替换）

- [ ] **Step 1: 写 `app/src/styles/tokens.css`**

深色沿用旧 DESIGN.md 色板；浅色用白底加蓝色结构，金色加深后只做点缀（#7d6223 对白底约 5.8:1）。

```css
:root,
:root[data-theme='dark'] {
  color-scheme: dark;
  --stage: #0c121b;
  --bg: #101722;
  --surface: #17212e;
  --surface-2: #1d2a3a;
  --border: #34465b;
  --text: #edf1f6;
  --text-2: #b3bfd0;
  --accent: #dab873;
  --accent-text: #1a1408;
  --brand: #dab873;
  --link: #e6c88a;
  --ok: #5cc98a;
  --warn: #e3b341;
  --bad: #f07178;
  --info: #6cb6ff;
  --frame: #0b1119;
  --shadow: 0 12px 32px rgb(0 0 0 / 0.45);
}

:root[data-theme='light'] {
  color-scheme: light;
  --stage: #e3e8ef;
  --bg: #f4f6f9;
  --surface: #ffffff;
  --surface-2: #eef2f7;
  --border: #d5dce6;
  --text: #1c2430;
  --text-2: #5a6678;
  --accent: #2f6fed;
  --accent-text: #ffffff;
  --brand: #7d6223;
  --link: #1f5fd6;
  --ok: #1a7f37;
  --warn: #9a6700;
  --bad: #cf222e;
  --info: #0969da;
  --frame: #1c2430;
  --shadow: 0 12px 32px rgb(28 36 48 / 0.18);
}
```

- [ ] **Step 2: 写 `app/src/styles/shell.css`**

```css
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  background: var(--stage);
  color: var(--text);
  font: 14px/1.6 system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
#root { display: flex; flex-direction: column; height: 100dvh; }
a { color: var(--link); }
button, select { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }
.muted { color: var(--text-2); }

/* 演示控制栏：演示工具，不属于企微界面 */
.control-bar { flex: none; z-index: 30; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 8px 16px; background: var(--surface-2); border-bottom: 1px dashed var(--border); }
.control-title { color: var(--brand); font-size: 13px; }
.control { display: inline-flex; align-items: center; gap: 4px; }
.control-label { margin-right: 2px; color: var(--text-2); font-size: 12px; }
.control select { padding: 3px 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; }
.control button, .control a { padding: 2px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; text-decoration: none; cursor: pointer; }
.control button[aria-pressed='true'], .control a[aria-current='page'] { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.control button:disabled { opacity: 0.45; cursor: not-allowed; }

/* 舞台 */
.stage { position: relative; flex: 1; min-height: 0; overflow: auto; }
.stage-phone { display: flex; justify-content: center; align-items: flex-start; gap: 24px; padding: 24px 16px; }

/* 手机框 */
.phone-frame { flex: none; display: flex; flex-direction: column; width: 390px; height: 844px; max-height: calc(100dvh - 120px); min-height: 560px; overflow: hidden; background: var(--bg); border: 10px solid var(--frame); border-radius: 36px; box-shadow: var(--shadow); }
.phone-top { flex: none; display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; height: 48px; padding: 0 4px; background: var(--surface); border-bottom: 1px solid var(--border); }
.phone-top h1 { margin: 0; overflow: hidden; font-size: 16px; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.phone-top-more { color: var(--text-2); text-align: center; }
.phone-content { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; }
.phone-tabs { flex: none; display: grid; grid-template-columns: repeat(4, 1fr); background: var(--surface); border-top: 1px solid var(--border); }
.phone-tabs a, .phone-tabs button { padding: 8px 0 10px; background: none; border: 0; color: var(--text-2); font-size: 12px; text-align: center; text-decoration: none; cursor: pointer; }
.phone-tabs [aria-current='page'] { color: var(--link); font-weight: 600; }

/* "我的"应用宫格 */
.apps { padding: 12px; }
.me-card { display: grid; gap: 2px; padding: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.me-card span { color: var(--text-2); font-size: 12px; }
.section-title { margin: 16px 4px 8px; color: var(--text-2); font-size: 13px; font-weight: 500; }
.app-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 4px; margin: 0; padding: 0; list-style: none; }
.app-grid a { display: grid; justify-items: center; gap: 4px; color: var(--text); font-size: 12px; text-align: center; text-decoration: none; }
.app-icon { display: grid; place-items: center; width: 44px; height: 44px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; color: var(--brand); font-size: 18px; }

/* 模块内页面切换条（手机） */
.module-tabs { display: flex; gap: 6px; padding: 8px 12px; overflow-x: auto; background: var(--surface); border-bottom: 1px solid var(--border); scrollbar-width: none; }
.module-tabs a { flex: none; padding: 2px 10px; border: 1px solid var(--border); border-radius: 999px; color: var(--text-2); font-size: 13px; text-decoration: none; white-space: nowrap; }
.module-tabs a[aria-current='page'] { border-color: currentColor; color: var(--link); }

/* 桌面框：模拟企微桌面端 */
.desktop-frame { display: grid; grid-template-columns: 232px minmax(0, 1fr); height: 100%; background: var(--bg); }
.desktop-wecom { grid-template-columns: minmax(0, 1fr); }
.desktop-side { overflow-y: auto; padding: 12px 8px; background: var(--surface); border-right: 1px solid var(--border); }
.desktop-brand { display: grid; margin-bottom: 8px; padding: 4px 8px 12px; border-bottom: 1px solid var(--border); }
.desktop-brand strong { color: var(--brand); }
.desktop-brand span { color: var(--text-2); font-size: 12px; }
.side-module { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-radius: 6px; color: var(--text); text-decoration: none; }
.side-module[aria-current='true'] { background: var(--surface-2); color: var(--link); font-weight: 600; }
.access { padding: 0 4px; border: 1px solid var(--border); border-radius: 4px; color: var(--text-2); font-size: 11px; font-weight: 400; }
.side-pages { margin: 2px 0 6px; padding: 0 0 0 12px; list-style: none; }
.side-pages a { display: block; padding: 3px 10px; border-radius: 6px; color: var(--text-2); font-size: 13px; text-decoration: none; }
.side-pages a[aria-current='page'] { background: var(--surface-2); color: var(--link); }
.desktop-main { overflow-y: auto; padding: 16px 24px 32px; }
.desktop-head h1 { margin: 0 0 12px; font-size: 22px; }

/* 页面通用 */
.scope-line { margin: 12px 16px 0; color: var(--text-2); font-size: 12px; }
.verify-banner { margin: 12px 16px 0; padding: 6px 10px; border: 1px solid var(--warn); border-radius: 8px; color: var(--warn); font-size: 13px; }
.placeholder, .notice { margin: 16px; padding: 16px; background: var(--surface); border: 1px dashed var(--border); border-radius: 12px; }
.placeholder h2, .notice h2 { margin: 4px 0 8px; font-size: 18px; }
.eyebrow { margin: 0; color: var(--brand); font-size: 12px; }
.button { display: inline-block; padding: 6px 14px; background: var(--accent); border: 0; border-radius: 8px; color: var(--accent-text); text-decoration: none; cursor: pointer; }
.icon-button { display: grid; place-items: center; width: 32px; height: 32px; background: none; border: 0; color: var(--text); font-size: 20px; text-decoration: none; cursor: pointer; }

/* 页面说明 */
.notes { flex: none; width: 320px; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.notes-head { display: flex; justify-content: space-between; align-items: center; color: var(--brand); }
.notes h2 { margin: 8px 0; font-size: 16px; }
.notes dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 8px 0 0; font-size: 13px; }
.notes dt { color: var(--text-2); }
.notes dd { margin: 0; }
.notes .verify-banner { margin: 12px 0 0; }
.notes-phone { position: sticky; top: 0; }
.notes-desktop { position: absolute; top: 0; right: 0; bottom: 0; z-index: 10; overflow-y: auto; border-width: 0 0 0 1px; border-radius: 0; box-shadow: var(--shadow); }

/* 手机框旁放不下说明时，说明改为底部浮层 */
@media (max-width: 820px) {
  .notes-phone { position: fixed; right: 8px; bottom: 8px; left: 8px; z-index: 20; width: auto; max-height: 45dvh; overflow-y: auto; box-shadow: var(--shadow); }
}

/* 真机窄屏：手机框铺满，不显示边框 */
@media (max-width: 480px) {
  .stage-phone { align-items: stretch; padding: 0; }
  .phone-frame { flex: 1; width: auto; height: auto; max-height: none; min-height: 0; border: 0; border-radius: 0; box-shadow: none; }
}
```

- [ ] **Step 3: 写 `app/src/shell/ControlBar.tsx`**

```tsx
import { href } from '../routes.ts';
import type { RouteMatch } from '../routes.ts';
import { roleGroups, roles } from '../roles.ts';
import type { Prefs } from './prefs.ts';

const forms = [
  { label: '工作台', to: href('/workbench') },
  { label: '侧边栏', to: href('/wecom/sidebar') },
  { label: '消息', to: href('/wecom/messages') },
  { label: '客户联系', to: href('/wecom/contacts') },
];

interface Props {
  prefs: Prefs;
  wide: boolean;
  notesOpen: boolean;
  match: RouteMatch;
  onChange: (patch: Partial<Prefs>) => void;
  onNotes: (open: boolean) => void;
}

/** 演示控制栏：演示工具，不属于企微界面。 */
export function ControlBar({ prefs, wide, notesOpen, match, onChange, onNotes }: Props) {
  const here = '#' + match.route.path;
  const currentForm = forms.find(f => f.to === here)?.to ?? forms[0].to;
  const phone = !wide || prefs.view === 'phone';
  return (
    <header className="control-bar">
      <strong className="control-title">演示控制栏</strong>
      <label className="control">
        <span className="control-label">身份</span>
        <select value={prefs.roleId} onChange={e => onChange({ roleId: e.target.value as Prefs['roleId'] })}>
          {roleGroups.map(group => (
            <optgroup key={group} label={group}>
              {roles
                .filter(r => r.group === group)
                .map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="control" role="group" aria-label="视图">
        <span className="control-label">视图</span>
        <button type="button" aria-pressed={phone} onClick={() => onChange({ view: 'phone' })}>
          手机
        </button>
        <button
          type="button"
          aria-pressed={!phone}
          disabled={!wide}
          title={wide ? undefined : '窗口窄于 1024px 时只能用手机视图'}
          onClick={() => onChange({ view: 'desktop' })}
        >
          桌面
        </button>
      </div>
      <nav className="control" aria-label="形态">
        <span className="control-label">形态</span>
        {forms.map(f => (
          <a key={f.to} href={f.to} aria-current={f.to === currentForm ? 'page' : undefined}>
            {f.label}
          </a>
        ))}
      </nav>
      <div className="control" role="group" aria-label="主题">
        <span className="control-label">主题</span>
        <button type="button" aria-pressed={prefs.theme === 'dark'} onClick={() => onChange({ theme: 'dark' })}>
          深
        </button>
        <button type="button" aria-pressed={prefs.theme === 'light'} onClick={() => onChange({ theme: 'light' })}>
          浅
        </button>
      </div>
      <div className="control" role="group" aria-label="页面说明">
        <span className="control-label">页面说明</span>
        <button type="button" aria-pressed={notesOpen} onClick={() => onNotes(true)}>
          开
        </button>
        <button type="button" aria-pressed={!notesOpen} onClick={() => onNotes(false)}>
          关
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: 写 `app/src/shell/PhoneFrame.tsx`**

```tsx
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
```

- [ ] **Step 5: 写 `app/src/shell/DesktopFrame.tsx`**

```tsx
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
```

- [ ] **Step 6: 写 `app/src/shell/NotesPanel.tsx`**

```tsx
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
```

- [ ] **Step 7: 写 `app/src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { href } from './routes.ts';
import { roleById, roles } from './roles.ts';
import { ControlBar } from './shell/ControlBar.tsx';
import { DesktopFrame } from './shell/DesktopFrame.tsx';
import { useHashRoute, useMediaQuery } from './shell/hooks.ts';
import { NotesPanel } from './shell/NotesPanel.tsx';
import { PhoneFrame } from './shell/PhoneFrame.tsx';
import { loadPrefs, savePrefs } from './shell/prefs.ts';
import type { Prefs } from './shell/prefs.ts';
import { Screen } from './shell/Screen.tsx';
import { ShellContext } from './shell/ShellContext.ts';

export function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  // 窄屏默认收起说明，免得浮层一打开就挡住手机框
  const [notesOpen, setNotesOpen] = useState(() => window.matchMedia('(min-width: 821px)').matches);
  const match = useHashRoute();
  const wide = useMediaQuery('(min-width: 1024px)');
  const role = roleById(prefs.roleId) ?? roles[0];
  const view = wide ? prefs.view : 'phone';

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    savePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    if (!match) window.location.replace(href('/workbench'));
  }, [match]);

  if (!match) return null;

  const update = (patch: Partial<Prefs>) => setPrefs(current => ({ ...current, ...patch }));
  const screen = <Screen match={match} />;

  return (
    <ShellContext.Provider value={{ role, view }}>
      <ControlBar prefs={prefs} wide={wide} notesOpen={notesOpen} match={match} onChange={update} onNotes={setNotesOpen} />
      <div className={`stage stage-${view}`}>
        {view === 'phone' ? <PhoneFrame match={match}>{screen}</PhoneFrame> : <DesktopFrame match={match}>{screen}</DesktopFrame>}
        {notesOpen && <NotesPanel match={match} onClose={() => setNotesOpen(false)} />}
      </div>
    </ShellContext.Provider>
  );
}
```

- [ ] **Step 8: 替换 `app/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { loadPrefs } from './shell/prefs.ts';
import './styles/tokens.css';
import './styles/shell.css';

// 首帧前先套上保存的主题，避免浅色用户看到一闪深色
document.documentElement.dataset.theme = loadPrefs().theme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 9: 检查与构建**

Run: `npm --prefix app run check`
Expected: `检查通过：路由、岗位、偏好、链接。`

Run: `npm --prefix app run build`
Expected: 通过，`✓ built in …`。

- [ ] **Step 10: 浏览器冒烟**

用浏览器面板启动 `.claude/launch.json` 里的 `gold-crm-app`（或运行 `npm --prefix app run dev` 后打开 http://127.0.0.1:5174 ）。
Expected: 自动跳到 `#/workbench`；顶部是演示控制栏；手机框里是工作台占位页，底部 Tab 为"工作台／看板／审批／我的"（默认身份老板）；控制台无报错。

- [ ] **Step 11: 提交**

```bash
git add app/src/styles/tokens.css app/src/styles/shell.css app/src/shell/ControlBar.tsx app/src/shell/PhoneFrame.tsx app/src/shell/DesktopFrame.tsx app/src/shell/NotesPanel.tsx app/src/App.tsx app/src/main.tsx
git commit -m "feat(app): assemble demo shell with phone and desktop frames"
```

---

### Task 7: 第 1 批验收与推送

**Files:** 无新增；发现问题就地修，修完再跑一遍本任务。

- [ ] **Step 1: 自动检查**

Run: `npm --prefix app run check` → `检查通过：路由、岗位、偏好、链接。`
Run: `npm --prefix app run build` → 通过。

- [ ] **Step 2: 16 个岗位的导航（设计稿第 10 节第 1 条）**

手机视图下逐个切身份，核对底部 Tab 和"我的"宫格；再切桌面视图核对侧栏和"主／看"标记。下表"可见模块"不含人人可见的工作台。

| 岗位 | 底部两个 Tab | 可见模块 |
|---|---|---|
| 老板 | 看板、审批 | 除系统设置外全部 12 个 |
| 总经理 | 审批、看板 | 除系统设置外全部 12 个 |
| 品牌线上运营 | 小程序、客户 | 客户与跟进、商品与设计、经营看板、小程序后台 |
| 店长 | 客户、业务单 | 客户与跟进、业务单、采购与库存、人事与提成、经营看板、审批中心 |
| 门店顾问 | 客户、业务单 | 客户与跟进、业务单、商品与设计、采购与库存 |
| 产品负责人 | 商品、业务单 | 业务单、商品与设计、采购与库存、经营看板 |
| 珠宝设计师 | 商品、业务单 | 业务单、商品与设计 |
| 采购 | 库存、财务 | 采购与库存、财务 |
| 仓库 | 库存、业务单 | 业务单、采购与库存、生产与质检、系统设置 |
| 生产主管 | 生产、审批 | 采购与库存、生产与质检、审批中心 |
| 工厂师傅 | 生产、人事 | 生产与质检、人事与提成 |
| 质检 | 生产、业务单 | 业务单、生产与质检 |
| 出纳／财务 | 财务、审批 | 业务单、财务、会计税务、审批中心 |
| 会计 | 会计、财务 | 财务、会计税务 |
| 人事行政 | 人事、审批 | 人事与提成、审批中心、系统设置 |
| 系统管理员 | 系统、小程序 | 小程序后台、系统设置 |

Expected: 每个岗位都与上表一致；有范围说明的岗位（如店长进采购与库存）页面顶部显示"本岗位范围：本店、调拨"。

- [ ] **Step 3: 拦截与跳转**

- 身份切到会计，打开 `#/wecom/sidebar` → 显示"本岗位无外部客户"；切到门店顾问 → 显示侧边栏占位页。
- 身份切到老板，打开 `#/system/ai` → 显示"本岗位看不到这个模块"，按钮回工作台。
- 打开 `#/nope` → 自动跳到 `#/workbench`。
- 打开 `#/finance/deposits`（老板）→ 页面和说明里都有"※ 本页待商家核实"。
- 打开 `#/customers/KH-001` → 手机顶栏有返回箭头，模块切换条高亮"客户列表"。

- [ ] **Step 4: 视图、主题、说明与保存**

- 宽窗口下切桌面视图：左侧模块侧栏，当前模块展开子页面；形态切到"消息"时侧栏隐藏。
- 主题切浅色：底色变白、主操作变蓝，文字清晰；切回深色正常。
- 页面说明开／关：手机视图在手机框右侧，桌面视图贴右侧；说明内容随页面变化。
- 切到店长＋桌面＋浅色后刷新 → 仍是店长、桌面、浅色。

- [ ] **Step 5: 窄屏（设计稿第 3 节）**

浏览器面板切到手机尺寸（375×812）后刷新：
Expected: 手机框铺满、无边框和阴影；"桌面"按钮不可点；页面说明默认收起，打开后是底部浮层。在页面里执行 `document.documentElement.scrollWidth <= document.documentElement.clientWidth` 结果为 `true`（无横向滚动）。验完把面板尺寸恢复为桌面。

- [ ] **Step 6: 控制台**

Expected: 以上操作全程控制台没有报错。

- [ ] **Step 7: 推送**

Run: `git push origin claude/clickable-prototype`
Expected: 推送成功；`git rev-parse HEAD` 与 `git rev-parse origin/claude/clickable-prototype` 一致。

- [ ] **Step 8: 记录**

按三问更新项目记忆（当前进度：第 1 批完成、提交号、下一步写第 2 批计划），提交并推送记忆库。
