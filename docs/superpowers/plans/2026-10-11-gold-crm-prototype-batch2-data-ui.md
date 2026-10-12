# 黄金CRM 点击原型 · 第 2 批：数据核心与通用组件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 定下原料、批次、生产、成品、客户、业务单、审批的数据模型和虚拟数据，写好批次平衡、单件成本、业务单毛利、系列耗用的推算函数和数据检查；做出通用组件（含原料徽章和占比色条）和桌面详情抽屉，用"原料批次""批次详情"两页验证。

**Architecture:** 数据层三个文件：`model.ts`（类型和计量规则）、`seed.ts`（只写基础事实）、`calc.ts`（纯函数，数据 `db` 从参数传入）。检查脚本新增数据、平衡、成本三组；平衡组另注入一种原料（铂金）重跑全部结构检查，再用"少记 1 g"的反例证明平衡检查能抓错。界面层 `src/ui/` 放通用组件，列表按当前视图出表格或卡片；原料用"色标＋计量图标"的徽章辨认，批次去向用占比色条一眼看出；桌面视图下详情页叠在所属列表页上、用右侧抽屉显示，由 `drawerParent()` 判断，列表页还没做的详情照常整页显示。

**Tech Stack:** 同第 1 批：React 19.3、TypeScript 5.9、Vite 8.3；Node 22.6 以上跑检查脚本。不加依赖。

依据：设计稿 `docs/superpowers/specs/2026-10-11-gold-crm-clickable-prototype-design.md` 第 6–10 节；路线图 `docs/superpowers/plans/2026-10-11-gold-crm-prototype-roadmap.md`；第 1 批代码（`f9f3354`）。

---

## 约定

- 同第 1 批：命令都在仓库根目录 `E:\Projects\黄金CRM` 执行，用 `npm --prefix app …`；提交信息末尾加当前会话要求的署名行；不改 `demo/`；不提交 `demo/preview.*.log` 和 `黄金CRM-业务与范围-v0.1.prg`。
- 检查脚本就是测试：有逻辑的部分先写检查、看它失败，再写实现。界面组件不写检查，靠构建和浏览器验。
- 金额存整数分，重量存整数毫克，宝石另记粒数（1 ct＝200 mg）；种子数据里出现非整数，检查直接报错。
- 种子数据只写基础事实；合计、平衡、成本、毛利一律调 `calc.ts`，页面里不手算。
- 本计划的代码已在临时副本试跑：`npm run check`（另用 7 种改坏的数据确认每种都能报出）、`npm run build`、浏览器手机／桌面视图和深／浅主题都通过（含原料徽章和去向色条）。

## 与路线图的出入（已定，实施时照做）

- **多做**：供应商最小档案（批次要引用采购来源）；详情分区组件 `Section`／`Fields`（设计稿第 9 节列了）；桌面视图的"页面说明"由浮在右侧改成占右侧一栏，不然会盖住详情抽屉。
- **推后**：款式工费和目标成本（第 3 批做款式详情时补）；审批链和阈值判断（第 4、6 批）；员工和经办人（第 5 批）；客户补到约 20 个（第 4 批）。审批里能由原记录推出的金额（如损耗成本）不写死。
- 阶段条暂时没有业务单页可用，先在批次详情上显示"采购入库 → 领用生产 → 结清"。
- **原料视觉（2026-10-11 Joe 定）**：原料不只靠编号辨认。数据里给每种原料一个本色 `swatch`，配按计量方式的图标（砝码／宝石／链扣）做成徽章，新原料只填颜色。批次详情加去向色条。不放照片：照片留给款式、成品和证书主石，等商家给图。色条用 `tokens.css` 的类别色 `--series-1～6`（已用 dataviz 校验器对两套主题的 `--surface` 校验通过；浅色下 3、4、5 号对白底不足 3:1，所以色条旁始终有文字平衡式），不用原料本色，因为足金、18K、24K 颜色太近，画进图表分不清。

## 虚拟数据要点

| 批次 | 原料 | 原量 | 去向（成品耗用、在制来自生产任务，其余来自库存流水） |
|---|---|---|---|
| PC-001 | 足金 | 100 g | 成品耗用 90（RW-001～004）＋余料 5＋回收料 3＋确认损耗 2 |
| PC-002 | 足金 | 50 g | 在制 20（RW-005）＋余料 29.7＋待核对 0.3 |
| PC-003 | 18K 金 | 30 g | 成品耗用 12＋余料 18 |
| PC-004 | 白钻配石 | 60 粒／3.00 ct | 成品耗用 48／2.40＋余料 10／0.50＋确认损耗 1／0.05＋待核对 1／0.05 |
| PC-005 | 黄彩钻主石 | 2 粒／0.80 ct，逐粒带证书 | 成品耗用 1（ZS-2026-0101）＋余料 1 |
| PC-006 | 足银 | 200 g | 成品耗用 40＋在制 40（RW-011）＋回收料 2＋余料 118 |
| PC-007 | 珐琅釉料 | 20 g | 成品耗用 1.2＋确认损耗 0.2＋余料 18.6 |

12 张业务单（YW-2026-001～012）覆盖 6 个阶段和设计稿第 8 节列的十种情形，每张的情形写在标题里。11 个生产任务出 9 件成品；未完成的 RW-005、RW-011 只算在制。原料目录 10 种：16K、24K 标"待核"，不写成色，主线不用；链扣配件按件计量，暂无批次。

## 文件结构

| 文件 | 职责 |
|---|---|
| `app/src/data/model.ts` | 类型（原料含本色 `swatch`）；计量方式与维度 `DIMS`；批次去向 `OUTLETS` |
| `app/src/data/seed.ts` | 虚拟数据和汇总对象 `db` |
| `app/src/data/calc.ts` | `get`、`sumBy`、`amountOf`、`lineCost`、`batchBalance`、`batchStatus`、`goodCost`、`orderMargin`、`seriesUsage` |
| `app/scripts/checks/data.ts` | 编号格式与唯一、整数、色标格式、引用、计量写法、证书石、任务与成品、系列构成 |
| `app/scripts/checks/balance.ts` | 各批次平衡、PC-001／PC-004／PC-002 定值、注入铂金、反例 |
| `app/scripts/checks/costs.ts` | 三种计量的金额、单件成本、毛利、系列耗用、系列与批次交叉核对 |
| `app/scripts/check.ts` | 接上三组；单组抛异常时记为失败，不盖住其他组的结果 |
| `app/src/ui/format.ts` | 金额、克、克拉、数量、单价、原料名的显示 |
| `app/src/ui/StatusTag.tsx`、`Stat.tsx`、`StageBar.tsx`、`Timeline.tsx`、`Section.tsx` | 状态标签、指标卡、阶段条、时间线、详情分区与字段表 |
| `app/src/ui/DataList.tsx` | 列配置＋数据：桌面出表格，手机转卡片 |
| `app/src/ui/Drawer.tsx` | 桌面详情抽屉 |
| `app/src/ui/MaterialBadge.tsx` | 原料徽章：本色色标＋计量方式图标＋名称和成色 |
| `app/src/ui/ShareBar.tsx` | 占比色条：按类别色固定上色，带图例 |
| `app/src/styles/ui.css` | 通用组件样式；`app/src/main.tsx` 引入 |
| `app/src/styles/tokens.css` | 两套主题各加 `--series-1～6` 图表类别色 |
| `app/src/pages/registry.ts` | 登记两页；`drawerParent()` |
| `app/src/shell/Screen.tsx`、`DesktopFrame.tsx`、`app/src/styles/shell.css` | 桌面详情进抽屉；标题和滚动跟着列表；说明改占一栏 |
| `app/src/pages/inventory/BatchList.tsx` | 原料批次（含 `BatchTag`） |
| `app/src/pages/inventory/BatchDetail.tsx` | 批次详情 |

---

### Task 1: 数据模型

**Files:**
- Create: `app/src/data/model.ts`

- [ ] **Step 1: 写 `app/src/data/model.ts`**

```ts
/**
 * 数据模型（设计稿第 7、8 节）。金额存整数分，重量存整数毫克（1 ct＝200 mg），宝石另记粒数、配件另记件数。
 * 编号之间的引用由 `npm run check` 核对。
 */

/** 计量方式：按重量（克，可带成色）、按粒＋重量（粒＋克拉，可单粒带证书）、按件。推算只认它，不认原料名称。 */
export type Measure = 'weight' | 'stone' | 'piece';

/** 各计量方式要记、要平衡的维度：按重量只记毫克，按件只记件数，按粒两样都记。 */
export const DIMS: Record<Measure, readonly ('mg' | 'count')[]> = { weight: ['mg'], stone: ['count', 'mg'], piece: ['count'] };

/** 数量：mg 为毫克，count 为粒数或件数；按 DIMS 只写该计量方式用到的维度。 */
export interface Qty {
  mg?: number;
  count?: number;
}

/** 批次去向：原量＝成品耗用＋余料＋回收料＋确认损耗＋在制＋待核对（设计稿第 7 节）。 */
export const OUTLETS = ['成品耗用', '余料', '回收料', '确认损耗', '在制', '待核对'] as const;
export type Outlet = (typeof OUTLETS)[number];

export interface Material {
  id: string;
  name: string;
  /** 类别也是数据：贵金属、钻石、彩钻、工艺材料、配件……新类别不用改代码 */
  category: string;
  measure: Measure;
  /** 原料本色（#rrggbb），只用来在徽章上认原料；图表用 tokens.css 的类别色，不用它 */
  swatch: string;
  /** 成色（‰）；宝石、配件和成色待核的不写 */
  fineness?: number;
  /** 参考单价（分）：按重量每克、按粒每克拉、按件每件 */
  refPrice: number;
  /** 参考价的来源和时点 */
  priceSource: string;
  /** 标准损耗率（‰） */
  lossRate: number;
  /** 整条待商家核实（如 16K、24K） */
  pending?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
}

/** 单粒管理的宝石：逐粒证书号、重量和采购价 */
export interface Stone {
  cert: string;
  mg: number;
  fen: number;
}

export interface Batch {
  id: string;
  material: string;
  supplier: string;
  receivedAt: string;
  /** 采购原量 */
  qty: Qty;
  /** 采购单价（分），单位同参考单价；有 stones 时成本逐粒取价，这里是批次均价 */
  price: number;
  stones?: readonly Stone[];
}

/** 库存流水记的四类去向；成品耗用和在制由生产任务的实际用料推出 */
export type MovementKind = Exclude<Outlet, '成品耗用' | '在制'>;

export interface Movement extends Qty {
  id: string;
  batch: string;
  kind: MovementKind;
  at: string;
  note: string;
}

export interface Series {
  id: string;
  name: string;
  /** 原料构成：款式的标准用料和任务的实际用料都只能用这些原料 */
  materials: readonly string[];
}

/** 标准用料表的一行 */
export interface BomLine extends Qty {
  material: string;
}

export interface Style {
  id: string;
  series: string;
  name: string;
  bom: readonly BomLine[];
}

/** 实际用料的一行：从哪个批次领、用了多少；单粒宝石写证书号 */
export interface UsageLine extends Qty {
  batch: string;
  cert?: string;
}

export type FeeKind = '基础工费' | '镶嵌费' | '珐琅工艺费' | '返工费' | '设计费';

/** 费用：没确认的显示"待补"，不计入成本（设计稿第 6 节） */
export interface Fee {
  kind: FeeKind;
  fen: number;
  confirmed: boolean;
}

export type TaskStatus = '待排产' | '制作中' | '待质检' | '返工中' | '已完成';

export interface Task {
  id: string;
  style: string;
  /** 定制单对应的业务单；备现货的任务不写 */
  order?: string;
  status: TaskStatus;
  /** 领料日期 */
  at: string;
  usage: readonly UsageLine[];
  fees: readonly Fee[];
}

/** 成品：一个已完成的生产任务出一件 */
export interface Good {
  id: string;
  task: string;
}

export interface Customer {
  id: string;
  name: string;
  /** 只留"会员／普通客户"标记，会员体系待商家核实 */
  member: boolean;
  source: '门店' | '小程序' | '活码';
}

export type Store = '城东店' | '城西店' | '小程序商城';

/** 业务单骨架；报价版本、记录链、付款／生产／交付状态在第 4 批补 */
export interface Order {
  id: string;
  customer: string;
  store: Store;
  kind: '现货' | '定制';
  title: string;
  /** 6 阶段序号：需求登记、方案报价、确认立单、备货与生产、质检与交付、售后与复盘 */
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  cancelled?: boolean;
  /** 成交价（分）；立单前没有，取消单为 0 */
  price?: number;
  goods: readonly string[];
  /** 记在业务单上的费用，如取消前已发生的设计费 */
  fees?: readonly Fee[];
}

/** 审批骨架；审批链和阈值判断在后续批次补 */
export interface Approval {
  id: string;
  kind: '价格例外' | '退款' | '重大损耗';
  /** 原记录编号：业务单、库存流水等 */
  ref: string;
  status: '待审批' | '已通过' | '已驳回';
  /** 涉及金额（分）；能由原记录推出的（如损耗成本）不写 */
  fen?: number;
}

export interface Db {
  materials: readonly Material[];
  suppliers: readonly Supplier[];
  batches: readonly Batch[];
  movements: readonly Movement[];
  series: readonly Series[];
  styles: readonly Style[];
  tasks: readonly Task[];
  goods: readonly Good[];
  customers: readonly Customer[];
  orders: readonly Order[];
  approvals: readonly Approval[];
}
```

- [ ] **Step 2: 类型检查**

Run: `npm --prefix app run build`
Expected: 通过（`tsconfig.json` 包含整个 `src`，没被引用的文件也会检查）。

- [ ] **Step 3: 提交**

```bash
git add app/src/data/model.ts
git commit -m "feat(app): add data model for materials, batches and orders"
```

---

### Task 2: 虚拟数据与结构检查

**Files:**
- Create: `app/scripts/checks/data.ts`
- Create: `app/src/data/seed.ts`
- Modify: `app/scripts/check.ts`（整体替换）

- [ ] **Step 1: 写结构检查 `app/scripts/checks/data.ts`**

`checkDb` 单独导出，Task 3 注入铂金后要拿它重跑。

```ts
import { DIMS } from '../../src/data/model.ts';
import type { Db, Measure, Qty } from '../../src/data/model.ts';
import { db } from '../../src/data/seed.ts';
import type { Check } from './types.ts';

/** 设计稿第 8 节：编号静态可读、不重复 */
const ID_RULES: ReadonlyArray<readonly [keyof Db, RegExp]> = [
  ['materials', /^YL-\d{3}$/],
  ['suppliers', /^GY-\d{3}$/],
  ['batches', /^PC-\d{3}$/],
  ['movements', /^LS-\d{3}$/],
  ['series', /^[A-Z]$/],
  ['styles', /^[A-Z]\d$/],
  ['tasks', /^RW-\d{3}$/],
  ['goods', /^CP-\d{3}$/],
  ['customers', /^KH-\d{3}$/],
  ['orders', /^YW-\d{4}-\d{3}$/],
  ['approvals', /^SP-\d{3}$/],
];

export function checkData(check: Check): void {
  checkDb(check, db, '');
}

/** 结构检查：编号、整数、引用、计量形状、单粒宝石、任务与成品。tag 区分注入测试用的数据。 */
export function checkDb(check: Check, d: Db, tag: string): void {
  const ids: string[] = [];
  for (const [name, pattern] of ID_RULES) {
    for (const { id } of d[name]) {
      ids.push(id);
      check(pattern.test(id), `${tag}${name}：编号 ${id} 格式不对`);
    }
  }
  check(new Set(ids).size === ids.length, `${tag}编号有重复`);

  const notInt: string[] = [];
  JSON.stringify(d, (key, value: unknown) => {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) notInt.push(`${key}=${value}`);
    return value;
  });
  check(notInt.length === 0, `${tag}金额、重量、件数都应是整数：${notInt.join('，')}`);

  const has = (list: readonly { id: string }[], id: string | undefined, where: string) =>
    check(list.some(x => x.id === id), `${tag}${where} 引用了不存在的编号 ${id}`);
  const measureOf = (materialId: string | undefined) => d.materials.find(m => m.id === materialId)?.measure;
  const batchOf = (batchId: string) => d.batches.find(b => b.id === batchId);
  const fits = (measure: Measure | undefined, q: Qty, where: string) =>
    check(
      measure !== undefined && (['mg', 'count'] as const).every(k => (DIMS[measure].includes(k) ? (q[k] ?? 0) > 0 : q[k] === undefined)),
      `${tag}${where} 的数量写法和计量方式不符`,
    );
  const seriesMaterials = (styleId: string) => d.series.find(s => s.id === d.styles.find(x => x.id === styleId)?.series)?.materials ?? [];

  for (const m of d.materials) check(/^#[0-9a-f]{6}$/.test(m.swatch), `${tag}${m.id} 的色标应写成 #rrggbb（小写）`);
  for (const b of d.batches) {
    has(d.materials, b.material, b.id);
    has(d.suppliers, b.supplier, b.id);
    fits(measureOf(b.material), b.qty, b.id);
    if (b.stones) {
      const mg = b.stones.reduce((sum, s) => sum + s.mg, 0);
      check(b.qty.count === b.stones.length && b.qty.mg === mg, `${tag}${b.id} 的原量应等于逐粒合计`);
    }
  }
  for (const m of d.movements) {
    has(d.batches, m.batch, m.id);
    fits(measureOf(batchOf(m.batch)?.material), m, m.id);
  }
  for (const s of d.series) for (const id of s.materials) has(d.materials, id, `系列 ${s.id}`);
  for (const s of d.styles) {
    has(d.series, s.series, `款式 ${s.id}`);
    check(s.id.startsWith(s.series), `${tag}款式 ${s.id} 的编号应以系列 ${s.series} 开头`);
    for (const line of s.bom) {
      fits(measureOf(line.material), line, `款式 ${s.id}`);
      check(seriesMaterials(s.id).includes(line.material), `${tag}款式 ${s.id} 用了系列构成以外的原料 ${line.material}`);
    }
  }

  const certs: string[] = [];
  for (const t of d.tasks) {
    has(d.styles, t.style, t.id);
    if (t.order) has(d.orders, t.order, t.id);
    for (const line of t.usage) {
      const batch = batchOf(line.batch);
      has(d.batches, line.batch, t.id);
      fits(measureOf(batch?.material), line, `${t.id}（${line.batch}）`);
      check(seriesMaterials(t.style).includes(batch?.material ?? ''), `${tag}${t.id} 用了系列构成以外的原料（批次 ${line.batch}）`);
      check((line.cert !== undefined) === Boolean(batch?.stones), `${tag}${t.id}：单粒管理的批次要写证书号，其他批次不写`);
      if (line.cert !== undefined) {
        certs.push(line.cert);
        check(Boolean(batch?.stones?.some(s => s.cert === line.cert)), `${tag}${t.id} 的证书号 ${line.cert} 不在批次 ${line.batch} 里`);
      }
    }
    const made = d.goods.filter(g => g.task === t.id);
    check(made.length === (t.status === '已完成' ? 1 : 0), `${tag}${t.id}：已完成的任务出一件成品，未完成的不出`);
    if (t.order && made.length === 1) {
      check(Boolean(d.orders.find(o => o.id === t.order)?.goods.includes(made[0].id)), `${tag}${t.id} 的成品应列在业务单 ${t.order} 里`);
    }
  }
  check(new Set(certs).size === certs.length, `${tag}同一粒证书石被用了两次`);

  for (const g of d.goods) has(d.tasks, g.task, g.id);
  const sold = d.orders.flatMap(o => o.goods);
  check(new Set(sold).size === sold.length, `${tag}同一件成品出现在两张业务单里`);
  for (const o of d.orders) {
    has(d.customers, o.customer, o.id);
    for (const id of o.goods) has(d.goods, id, o.id);
  }
  for (const a of d.approvals) check(ids.includes(a.ref), `${tag}${a.id} 引用了不存在的编号 ${a.ref}`);
}
```

- [ ] **Step 2: 检查入口接上数据组 `app/scripts/check.ts`**

同时给每组加 `try／catch`：数据坏到推算函数取不到记录时，前面各组的失败照样列出来。

```ts
import { checkData } from './checks/data.ts';
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
  ['数据', checkData],
];

const failures: string[] = [];
for (const [name, run] of sections) {
  try {
    run((ok, message) => {
      if (!ok) failures.push(message);
    });
  } catch (error) {
    // 数据坏到推算函数取不到记录时，照样列出前面各组的失败，不让一个异常盖住它们
    failures.push(`${name}检查中断：${(error as Error).message}`);
  }
}

if (failures.length > 0) {
  console.error(`检查未通过（${failures.length} 项）：\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`检查通过：${sections.map(([name]) => name).join('、')}。`);
```

- [ ] **Step 3: 运行检查，确认失败**

Run: `npm --prefix app run check`
Expected: FAIL，`Error [ERR_MODULE_NOT_FOUND]: Cannot find module …\src\data\seed.ts`。

- [ ] **Step 4: 写 `app/src/data/seed.ts`**

```ts
import type { Approval, Batch, Customer, Db, Good, Material, Movement, Order, Series, Style, Supplier, Task } from './model.ts';

/**
 * 虚拟数据（设计稿第 8 节）：示例金店，主线是 100g 足金批次 PC-001。
 * 只写基础记录；合计、平衡、成本和毛利都由 calc.ts 推算，不在这里手写。
 */

/** 原料目录：目前只知道这些，数值都是虚拟值，完整清单待商家补全 */
export const materials: readonly Material[] = [
  { id: 'YL-001', name: '足金', category: '贵金属', measure: 'weight', swatch: '#d9b44a', fineness: 990, refPrice: 80000, priceSource: '虚拟参考价 2026-10-12', lossRate: 5 },
  { id: 'YL-002', name: '18K 金', category: '贵金属', measure: 'weight', swatch: '#cfae7a', fineness: 750, refPrice: 60000, priceSource: '虚拟参考价 2026-10-12', lossRate: 8 },
  { id: 'YL-003', name: '足银', category: '贵金属', measure: 'weight', swatch: '#c9cdd2', fineness: 990, refPrice: 1000, priceSource: '虚拟参考价 2026-10-12', lossRate: 10 },
  { id: 'YL-004', name: '925 银', category: '贵金属', measure: 'weight', swatch: '#bfc3c8', fineness: 925, refPrice: 900, priceSource: '虚拟参考价 2026-10-12', lossRate: 10 },
  { id: 'YL-005', name: '白钻配石', category: '钻石', measure: 'stone', swatch: '#eef3f8', refPrice: 500000, priceSource: '按批次采购价，无公开行情', lossRate: 20 },
  { id: 'YL-006', name: '黄彩钻主石', category: '彩钻', measure: 'stone', swatch: '#f2c94c', refPrice: 3500000, priceSource: '逐粒采购价，无公开行情', lossRate: 0 },
  { id: 'YL-007', name: '珐琅釉料', category: '工艺材料', measure: 'weight', swatch: '#5b8fd6', refPrice: 2000, priceSource: '虚拟参考价 2026-10-12', lossRate: 100 },
  { id: 'YL-008', name: '链扣配件', category: '配件', measure: 'piece', swatch: '#a9adb3', refPrice: 1500, priceSource: '虚拟参考价 2026-10-12', lossRate: 0 },
  { id: 'YL-009', name: '16K 金', category: '贵金属', measure: 'weight', swatch: '#c8a26e', refPrice: 50000, priceSource: '虚拟参考价，成色与标注待核', lossRate: 8, pending: true },
  { id: 'YL-010', name: '24K 金', category: '贵金属', measure: 'weight', swatch: '#e0b83c', refPrice: 82000, priceSource: '虚拟参考价，成色与标注待核', lossRate: 5, pending: true },
];

export const suppliers: readonly Supplier[] = [
  { id: 'GY-001', name: '金源贵金属（虚构）' },
  { id: 'GY-002', name: '晶彩宝石（虚构）' },
  { id: 'GY-003', name: '华彩珐琅材料（虚构）' },
];

/** 原料批次 PC-001～PC-007：足金两批、18K 金、白钻配石、黄彩钻主石、足银、珐琅 */
export const batches: readonly Batch[] = [
  { id: 'PC-001', material: 'YL-001', supplier: 'GY-001', receivedAt: '2026-09-01', qty: { mg: 100000 }, price: 78000 },
  { id: 'PC-002', material: 'YL-001', supplier: 'GY-001', receivedAt: '2026-10-08', qty: { mg: 50000 }, price: 80000 },
  { id: 'PC-003', material: 'YL-002', supplier: 'GY-001', receivedAt: '2026-09-05', qty: { mg: 30000 }, price: 58000 },
  { id: 'PC-004', material: 'YL-005', supplier: 'GY-002', receivedAt: '2026-09-05', qty: { count: 60, mg: 600 }, price: 480000 },
  {
    id: 'PC-005',
    material: 'YL-006',
    supplier: 'GY-002',
    receivedAt: '2026-09-12',
    qty: { count: 2, mg: 160 },
    price: 3375000,
    stones: [
      { cert: 'ZS-2026-0101', mg: 100, fen: 1800000 },
      { cert: 'ZS-2026-0102', mg: 60, fen: 900000 },
    ],
  },
  { id: 'PC-006', material: 'YL-003', supplier: 'GY-001', receivedAt: '2026-09-10', qty: { mg: 200000 }, price: 900 },
  { id: 'PC-007', material: 'YL-007', supplier: 'GY-003', receivedAt: '2026-09-03', qty: { mg: 20000 }, price: 2000 },
];

/** 库存流水里记的去向：余料、回收料、确认损耗、待核对 */
export const movements: readonly Movement[] = [
  { id: 'LS-001', batch: 'PC-001', kind: '余料', mg: 5000, at: '2026-10-10', note: '月末盘点，余料在库' },
  { id: 'LS-002', batch: 'PC-001', kind: '回收料', mg: 3000, at: '2026-10-10', note: '锉粉、边角熔炼回收' },
  { id: 'LS-003', batch: 'PC-001', kind: '确认损耗', mg: 2000, at: '2026-10-10', note: '熔炼和抛光损耗，已审批' },
  { id: 'LS-004', batch: 'PC-002', kind: '待核对', mg: 300, at: '2026-10-11', note: '领料复称差 0.3 g，待核对' },
  { id: 'LS-005', batch: 'PC-002', kind: '余料', mg: 29700, at: '2026-10-11', note: '当日盘点，余料在库' },
  { id: 'LS-006', batch: 'PC-003', kind: '余料', mg: 18000, at: '2026-10-10', note: '月末盘点，余料在库' },
  { id: 'LS-007', batch: 'PC-004', kind: '余料', count: 10, mg: 100, at: '2026-10-10', note: '月末盘点，余石在库' },
  { id: 'LS-008', batch: 'PC-004', kind: '确认损耗', count: 1, mg: 10, at: '2026-09-28', note: '镶嵌时掉石 1 粒，已确认' },
  { id: 'LS-009', batch: 'PC-004', kind: '待核对', count: 1, mg: 10, at: '2026-10-10', note: '盘点少 1 粒，待核对' },
  { id: 'LS-010', batch: 'PC-005', kind: '余料', count: 1, mg: 60, at: '2026-10-10', note: '主石 ZS-2026-0102 在库' },
  { id: 'LS-011', batch: 'PC-006', kind: '回收料', mg: 2000, at: '2026-10-10', note: '银粉回收' },
  { id: 'LS-012', batch: 'PC-006', kind: '余料', mg: 118000, at: '2026-10-10', note: '月末盘点，余料在库' },
  { id: 'LS-013', batch: 'PC-007', kind: '确认损耗', mg: 200, at: '2026-10-10', note: '调釉、烧制损耗' },
  { id: 'LS-014', batch: 'PC-007', kind: '余料', mg: 18600, at: '2026-10-10', note: '月末盘点，余料在库' },
];

export const series: readonly Series[] = [
  { id: 'A', name: '素金系列', materials: ['YL-001'] },
  { id: 'B', name: '珐琅足金系列', materials: ['YL-001', 'YL-007'] },
  { id: 'C', name: '18K 白钻系列', materials: ['YL-002', 'YL-005'] },
  { id: 'D', name: '18K 彩钻系列', materials: ['YL-002', 'YL-006', 'YL-005'] },
  { id: 'E', name: '足银系列', materials: ['YL-003'] },
];

/** 款式与标准用料表；工费和目标成本在第 3 批补 */
export const styles: readonly Style[] = [
  { id: 'A1', series: 'A', name: '足金素圈手镯', bom: [{ material: 'YL-001', mg: 35000 }] },
  { id: 'A2', series: 'A', name: '足金平安扣吊坠', bom: [{ material: 'YL-001', mg: 8000 }] },
  { id: 'B1', series: 'B', name: '珐琅足金花瓣吊坠', bom: [{ material: 'YL-001', mg: 12000 }, { material: 'YL-007', mg: 500 }] },
  { id: 'B2', series: 'B', name: '珐琅足金戒指', bom: [{ material: 'YL-001', mg: 8000 }, { material: 'YL-007', mg: 400 }] },
  { id: 'B3', series: 'B', name: '珐琅足金耳饰', bom: [{ material: 'YL-001', mg: 6000 }, { material: 'YL-007', mg: 300 }] },
  { id: 'B4', series: 'B', name: '珐琅足金手链', bom: [{ material: 'YL-001', mg: 15000 }, { material: 'YL-007', mg: 600 }] },
  { id: 'C1', series: 'C', name: '18K 白钻排钻戒指', bom: [{ material: 'YL-002', mg: 3000 }, { material: 'YL-005', count: 12, mg: 120 }] },
  { id: 'C2', series: 'C', name: '18K 白钻耳钉', bom: [{ material: 'YL-002', mg: 2000 }, { material: 'YL-005', count: 8, mg: 80 }] },
  {
    id: 'D1',
    series: 'D',
    name: '18K 黄彩钻吊坠',
    bom: [{ material: 'YL-002', mg: 4000 }, { material: 'YL-006', count: 1, mg: 100 }, { material: 'YL-005', count: 16, mg: 160 }],
  },
  { id: 'E1', series: 'E', name: '足银手镯', bom: [{ material: 'YL-003', mg: 40000 }] },
];

/** 生产任务与实际用料；RW-003 返工追加了珐琅和返工费，首轮用料保留 */
export const tasks: readonly Task[] = [
  { id: 'RW-001', style: 'A1', status: '已完成', at: '2026-09-03', usage: [{ batch: 'PC-001', mg: 40000 }], fees: [{ kind: '基础工费', fen: 40000, confirmed: true }] },
  { id: 'RW-002', style: 'A1', status: '已完成', at: '2026-09-03', usage: [{ batch: 'PC-001', mg: 30000 }], fees: [{ kind: '基础工费', fen: 30000, confirmed: true }] },
  {
    id: 'RW-003',
    style: 'B1',
    order: 'YW-2026-004',
    status: '已完成',
    at: '2026-09-08',
    usage: [{ batch: 'PC-001', mg: 12000 }, { batch: 'PC-007', mg: 500 }, { batch: 'PC-007', mg: 300 }],
    fees: [
      { kind: '基础工费', fen: 15000, confirmed: true },
      { kind: '珐琅工艺费', fen: 20000, confirmed: true },
      { kind: '返工费', fen: 8000, confirmed: true },
    ],
  },
  {
    id: 'RW-004',
    style: 'B2',
    status: '已完成',
    at: '2026-09-15',
    usage: [{ batch: 'PC-001', mg: 8000 }, { batch: 'PC-007', mg: 400 }],
    fees: [
      { kind: '基础工费', fen: 10000, confirmed: true },
      { kind: '珐琅工艺费', fen: 15000, confirmed: false },
    ],
  },
  { id: 'RW-005', style: 'A1', order: 'YW-2026-002', status: '制作中', at: '2026-10-09', usage: [{ batch: 'PC-002', mg: 20000 }], fees: [{ kind: '基础工费', fen: 30000, confirmed: false }] },
  {
    id: 'RW-006',
    style: 'C1',
    status: '已完成',
    at: '2026-09-18',
    usage: [{ batch: 'PC-003', mg: 3000 }, { batch: 'PC-004', count: 12, mg: 120 }],
    fees: [
      { kind: '基础工费', fen: 20000, confirmed: true },
      { kind: '镶嵌费', fen: 36000, confirmed: true },
    ],
  },
  {
    id: 'RW-007',
    style: 'C1',
    status: '已完成',
    at: '2026-09-18',
    usage: [{ batch: 'PC-003', mg: 3000 }, { batch: 'PC-004', count: 12, mg: 120 }],
    fees: [
      { kind: '基础工费', fen: 20000, confirmed: true },
      { kind: '镶嵌费', fen: 36000, confirmed: true },
    ],
  },
  {
    id: 'RW-008',
    style: 'D1',
    order: 'YW-2026-003',
    status: '已完成',
    at: '2026-09-20',
    usage: [{ batch: 'PC-003', mg: 4000 }, { batch: 'PC-005', count: 1, mg: 100, cert: 'ZS-2026-0101' }, { batch: 'PC-004', count: 16, mg: 160 }],
    fees: [
      { kind: '基础工费', fen: 30000, confirmed: true },
      { kind: '镶嵌费', fen: 51000, confirmed: true },
    ],
  },
  {
    id: 'RW-009',
    style: 'C2',
    status: '已完成',
    at: '2026-09-25',
    usage: [{ batch: 'PC-003', mg: 2000 }, { batch: 'PC-004', count: 8, mg: 80 }],
    fees: [
      { kind: '基础工费', fen: 15000, confirmed: true },
      { kind: '镶嵌费', fen: 24000, confirmed: true },
    ],
  },
  { id: 'RW-010', style: 'E1', status: '已完成', at: '2026-09-22', usage: [{ batch: 'PC-006', mg: 40000 }], fees: [{ kind: '基础工费', fen: 5000, confirmed: true }] },
  { id: 'RW-011', style: 'E1', order: 'YW-2026-008', status: '待质检', at: '2026-10-09', usage: [{ batch: 'PC-006', mg: 40000 }], fees: [{ kind: '基础工费', fen: 5000, confirmed: false }] },
];

export const goods: readonly Good[] = [
  { id: 'CP-001', task: 'RW-001' },
  { id: 'CP-002', task: 'RW-002' },
  { id: 'CP-003', task: 'RW-003' },
  { id: 'CP-004', task: 'RW-004' },
  { id: 'CP-005', task: 'RW-006' },
  { id: 'CP-006', task: 'RW-007' },
  { id: 'CP-007', task: 'RW-008' },
  { id: 'CP-008', task: 'RW-009' },
  { id: 'CP-009', task: 'RW-010' },
];

/** 有业务单的客户；其余线索客户在第 4 批补到约 20 个 */
export const customers: readonly Customer[] = [
  { id: 'KH-001', name: '林女士', member: true, source: '门店' },
  { id: 'KH-002', name: '陈先生', member: false, source: '门店' },
  { id: 'KH-003', name: '王女士', member: true, source: '活码' },
  { id: 'KH-004', name: '赵女士', member: false, source: '门店' },
  { id: 'KH-005', name: '周先生', member: false, source: '小程序' },
  { id: 'KH-006', name: '吴女士', member: false, source: '活码' },
  { id: 'KH-007', name: '郑先生', member: true, source: '门店' },
  { id: 'KH-008', name: '孙女士', member: false, source: '小程序' },
  { id: 'KH-009', name: '何女士', member: true, source: '门店' },
  { id: 'KH-010', name: '示例商贸有限公司', member: false, source: '门店' },
  { id: 'KH-011', name: '许先生', member: false, source: '活码' },
];

/** 12 张业务单覆盖 6 个阶段和设计稿第 8 节的各种情形 */
export const orders: readonly Order[] = [
  { id: 'YW-2026-001', customer: 'KH-001', store: '城东店', kind: '现货', title: '足金素圈手镯（现货锁定出库）', stage: 5, price: 3580000, goods: ['CP-001'] },
  { id: 'YW-2026-002', customer: 'KH-002', store: '城东店', kind: '定制', title: '足金刻字手镯（定制，先收定金）', stage: 4, price: 2700000, goods: [] },
  { id: 'YW-2026-003', customer: 'KH-003', store: '城西店', kind: '定制', title: '18K 黄彩钻吊坠（主石带证书）', stage: 5, price: 3280000, goods: ['CP-007'] },
  { id: 'YW-2026-004', customer: 'KH-004', store: '城东店', kind: '定制', title: '珐琅足金花瓣吊坠（返工后复检）', stage: 5, price: 1380000, goods: ['CP-003'] },
  { id: 'YW-2026-005', customer: 'KH-005', store: '小程序商城', kind: '现货', title: '珐琅足金戒指（退货退款）', stage: 6, price: 980000, goods: ['CP-004'] },
  {
    id: 'YW-2026-006',
    customer: 'KH-006',
    store: '城西店',
    kind: '定制',
    title: '足金对戒（已取消）',
    stage: 3,
    cancelled: true,
    price: 0,
    goods: [],
    fees: [{ kind: '设计费', fen: 30000, confirmed: true }],
  },
  { id: 'YW-2026-007', customer: 'KH-007', store: '城东店', kind: '现货', title: '足金平安扣吊坠（价格例外待批）', stage: 2, goods: [] },
  { id: 'YW-2026-008', customer: 'KH-008', store: '小程序商城', kind: '定制', title: '足银手镯（小程序订单）', stage: 4, price: 68000, goods: [] },
  { id: 'YW-2026-009', customer: 'KH-009', store: '城西店', kind: '现货', title: '足金素圈手镯（跨店调拨）', stage: 4, price: 2760000, goods: ['CP-002'] },
  { id: 'YW-2026-010', customer: 'KH-010', store: '城东店', kind: '现货', title: '18K 白钻戒指和耳钉（账期客户）', stage: 6, price: 1260000, goods: ['CP-006', 'CP-008'] },
  { id: 'YW-2026-011', customer: 'KH-011', store: '城西店', kind: '定制', title: '珐琅足金手链（需求登记）', stage: 1, goods: [] },
  { id: 'YW-2026-012', customer: 'KH-001', store: '城东店', kind: '现货', title: '18K 白钻排钻戒指（复购）', stage: 6, price: 720000, goods: ['CP-005'] },
];

export const approvals: readonly Approval[] = [
  { id: 'SP-001', kind: '价格例外', ref: 'YW-2026-007', status: '待审批', fen: 80000 },
  { id: 'SP-002', kind: '退款', ref: 'YW-2026-005', status: '已通过', fen: 980000 },
  { id: 'SP-003', kind: '重大损耗', ref: 'LS-003', status: '已通过' },
];

export const db: Db = { materials, suppliers, batches, movements, series, styles, tasks, goods, customers, orders, approvals };
```

- [ ] **Step 5: 运行检查，确认通过**

Run: `npm --prefix app run check`
Expected: `检查通过：路由、岗位、偏好、链接、数据。`

- [ ] **Step 6: 类型检查**

Run: `npm --prefix app run build`
Expected: 通过。

- [ ] **Step 7: 提交**

```bash
git add app/scripts/checks/data.ts app/scripts/check.ts app/src/data/seed.ts
git commit -m "feat(app): add seed data with structure checks"
```

- [ ] **Step 8: 确认检查能抓错**

把 `seed.ts` 里 YW-2026-011 的 `customer: 'KH-011'` 临时改成 `customer: 'KH-099'`。
Run: `npm --prefix app run check`
Expected: FAIL，含 `YW-2026-011 引用了不存在的编号 KH-099`。
Run: `git checkout -- app/src/data/seed.ts`，再跑一次检查回到通过。

---

### Task 3: 推算函数（平衡、成本、毛利、系列耗用）

**Files:**
- Create: `app/scripts/checks/balance.ts`
- Create: `app/scripts/checks/costs.ts`
- Create: `app/src/data/calc.ts`
- Modify: `app/scripts/check.ts`

- [ ] **Step 1: 写平衡检查 `app/scripts/checks/balance.ts`**

去向写成一行字符串比对，顺序同 `OUTLETS`；铂金注入用一份新的 `db`，不碰 `seed.ts`。

```ts
import { batchBalance, batchStatus, get } from '../../src/data/calc.ts';
import { OUTLETS } from '../../src/data/model.ts';
import type { Batch, Db, Material, Movement } from '../../src/data/model.ts';
import { db } from '../../src/data/seed.ts';
import { checkDb } from './data.ts';
import type { Check } from './types.ts';

/** 按 OUTLETS 顺序（成品耗用 余料 回收料 确认损耗 在制 待核对）写成一行，单位毫克；宝石写成"粒/毫克"。 */
function outlets(d: Db, batchId: string): string {
  const { parts } = batchBalance(d, get(d.batches, batchId));
  return OUTLETS.map(o => (parts[o].count > 0 ? `${parts[o].count}/${parts[o].mg}` : `${parts[o].mg}`)).join(' ');
}

export function checkBalance(check: Check): void {
  for (const b of db.batches) {
    const { balanced, total } = batchBalance(db, b);
    check(balanced, `${b.id} 不平：原量 ${JSON.stringify(b.qty)}，去向合计 ${JSON.stringify(total)}`);
  }

  // 设计稿第 10 节第 4 条
  check(outlets(db, 'PC-001') === '90000 5000 3000 2000 0 0', `PC-001 应为 100g＝90＋5＋3＋2，实际 ${outlets(db, 'PC-001')}`);
  check(outlets(db, 'PC-004') === '48/480 10/100 0 1/10 0 1/10', `PC-004 应为 60 粒＝48＋10＋1＋1、600mg＝480＋100＋10＋10，实际 ${outlets(db, 'PC-004')}`);
  check(outlets(db, 'PC-002') === '0 29700 0 0 20000 300', `PC-002 应在制 20 g、待核对 0.3 g，实际 ${outlets(db, 'PC-002')}`);
  const status = (id: string) => batchStatus(batchBalance(db, get(db.batches, id)));
  check(status('PC-001') === '已结清' && status('PC-002') === '在制' && status('PC-004') === '待核对', '批次状态推算不对');

  // 设计稿第 10 节第 9 条：临时加一种原料（铂金）和一个批次，推算和检查照常工作
  const platinum: Material = { id: 'YL-099', name: '铂金', category: '贵金属', measure: 'weight', swatch: '#dcdfe2', fineness: 950, refPrice: 30000, priceSource: '注入测试', lossRate: 5 };
  const ptBatch: Batch = { id: 'PC-099', material: 'YL-099', supplier: 'GY-001', receivedAt: '2026-10-12', qty: { mg: 10000 }, price: 29000 };
  const ptLeft: Movement = { id: 'LS-099', batch: 'PC-099', kind: '余料', mg: 10000, at: '2026-10-12', note: '注入测试' };
  const withPt: Db = { ...db, materials: [...db.materials, platinum], batches: [...db.batches, ptBatch], movements: [...db.movements, ptLeft] };
  checkDb(check, withPt, '（注入铂金后）');
  check(batchBalance(withPt, ptBatch).balanced && outlets(withPt, 'PC-099') === '0 10000 0 0 0 0', '注入的铂金批次应按重量平衡');

  // 反例：少记 1 g 去向必须判为不平，说明平衡检查不是自己验自己
  const broken: Db = { ...withPt, movements: [...db.movements, { ...ptLeft, mg: 9000 }] };
  check(!batchBalance(broken, ptBatch).balanced, '少记 1 g 去向时应判为不平');
}
```

- [ ] **Step 2: 写成本检查 `app/scripts/checks/costs.ts`**

期望值按种子数据手算：CP-007＝18K 金 4 g×¥580＋证书石 ¥18,000＋白钻 0.80 ct×¥4,800＋工费 ¥810＝¥24,970；CP-004 的珐琅工艺费未确认，只计 ¥6,348。

```ts
import { amountOf, batchBalance, get, goodCost, orderMargin, seriesUsage, sumBy } from '../../src/data/calc.ts';
import type { Amount } from '../../src/data/calc.ts';
import { db } from '../../src/data/seed.ts';
import type { Check } from './types.ts';

export function checkCosts(check: Check): void {
  // 三种计量方式的金额换算
  check(amountOf('weight', { mg: 1500 }, 80000) === 120000, '按重量：1.5 g × ¥800/克 应为 ¥1,200');
  check(amountOf('stone', { count: 1, mg: 10 }, 500000) === 25000, '按粒：0.05 ct × ¥5,000/克拉 应为 ¥250');
  check(amountOf('piece', { count: 3 }, 1500) === 4500, '按件：3 件 × ¥15/件 应为 ¥45');

  // 单件成本按原料类别拆开：18K 金 4 g、证书主石 1 粒、白钻 16 粒，加已确认工费
  const d1 = JSON.stringify(goodCost(db, get(db.goods, 'CP-007')));
  check(d1 === '{"byCategory":{"贵金属":232000,"彩钻":1800000,"钻石":384000},"labor":81000,"total":2497000,"pending":[]}', `CP-007 成本不对：${d1}`);
  const b2 = goodCost(db, get(db.goods, 'CP-004'));
  check(b2.total === 634800 && b2.pending.join() === '珐琅工艺费', `CP-004 应计 ¥6,348，珐琅工艺费列为待补，实际 ${JSON.stringify(b2)}`);

  // 业务单毛利＝成交价－已确认成本（设计稿第 6 节）
  const margin = (id: string) => JSON.stringify(orderMargin(db, get(db.orders, id)));
  check(margin('YW-2026-001') === '{"price":3580000,"cost":3160000,"margin":420000,"pending":false}', `YW-2026-001 毛利不对：${margin('YW-2026-001')}`);
  check(margin('YW-2026-005') === '{"price":980000,"cost":634800,"margin":345200,"pending":true}', `YW-2026-005 应带待补成本：${margin('YW-2026-005')}`);
  check(margin('YW-2026-006') === '{"price":0,"cost":30000,"margin":-30000,"pending":false}', `取消单应保留已发生费用：${margin('YW-2026-006')}`);
  check(margin('YW-2026-002') === '{"price":2700000,"cost":0,"margin":2700000,"pending":true}', `在制的定制单成本应待补：${margin('YW-2026-002')}`);
  check(orderMargin(db, get(db.orders, 'YW-2026-007')).margin === undefined, '还没成交价的业务单不算毛利');

  // 系列实际耗用：B 系列＝足金 20 g＋珐琅 1.2 g
  const b = seriesUsage(db, get(db.series, 'B'))
    .map(r => `${r.material.id}:${r.qty.mg}:${r.fen}`)
    .join(' ');
  check(b === 'YL-001:20000:1560000 YL-007:1200:2400', `B 系列耗用不对：${b}`);

  // 交叉核对：各系列实际耗用按原料加总，应等于各批次的成品耗用
  const total = (list: Amount[]) => `${sumBy(list, a => a.mg)} mg / ${sumBy(list, a => a.count)}`;
  for (const m of db.materials) {
    const bySeries = total(db.series.flatMap(s => seriesUsage(db, s).filter(r => r.material.id === m.id).map(r => r.qty)));
    const byBatch = total(db.batches.filter(x => x.material === m.id).map(x => batchBalance(db, x).parts['成品耗用']));
    check(bySeries === byBatch, `${m.name}：各系列耗用合计 ${bySeries}，各批次成品耗用 ${byBatch}，对不上`);
  }
}
```

- [ ] **Step 3: 检查入口接上两组 `app/scripts/check.ts`**

文件开头加两行导入：

```ts
import { checkBalance } from './checks/balance.ts';
import { checkCosts } from './checks/costs.ts';
```

`sections` 里 `['数据', checkData],` 之后加两行：

```ts
  ['平衡', checkBalance],
  ['成本', checkCosts],
```

- [ ] **Step 4: 运行检查，确认失败**

Run: `npm --prefix app run check`
Expected: FAIL，`Error [ERR_MODULE_NOT_FOUND]: Cannot find module …\src\data\calc.ts`。

- [ ] **Step 5: 写 `app/src/data/calc.ts`**

```ts
import { OUTLETS } from './model.ts';
import type { Batch, Db, FeeKind, Good, Material, Measure, Order, Outlet, Qty, Series, UsageLine } from './model.ts';

/**
 * 推算函数（设计稿第 7、8 节）：页面上的平衡、成本、毛利和合计都从这里来，不手写。
 * 都是纯函数，数据从参数 db 传入，检查脚本可以换一份数据（如注入铂金）照样跑。
 */

/** 推算结果里的数量：两个维度都给出，没用到的为 0 */
export type Amount = Required<Qty>;

/** 按编号取记录；编号都由检查脚本核过，取不到说明数据坏了，直接报错。 */
export function get<T extends { id: string }>(list: readonly T[], id: string): T {
  const found = list.find(x => x.id === id);
  if (!found) throw new Error(`找不到编号 ${id}`);
  return found;
}

export function sumBy<T>(list: readonly T[], value: (item: T) => number): number {
  return list.reduce((sum, item) => sum + value(item), 0);
}

function add(into: Amount, q: Qty): void {
  into.mg += q.mg ?? 0;
  into.count += q.count ?? 0;
}

/** 按计量方式算金额：price 按重量是分/克，按粒是分/克拉（1 ct＝200 mg），按件是分/件。 */
export function amountOf(measure: Measure, q: Qty, price: number): number {
  if (measure === 'piece') return (q.count ?? 0) * price;
  return Math.round(((q.mg ?? 0) * price) / (measure === 'weight' ? 1000 : 200));
}

function materialOf(db: Db, batchId: string): Material {
  return get(db.materials, get(db.batches, batchId).material);
}

/** 一行实际用料的成本：单粒宝石取该粒的采购价，其余按所用批次的单价。 */
export function lineCost(db: Db, line: UsageLine): number {
  const batch = get(db.batches, line.batch);
  const stone = batch.stones?.find(s => s.cert === line.cert);
  return stone ? stone.fen : amountOf(materialOf(db, line.batch).measure, line, batch.price);
}

export interface BatchBalance {
  batch: Batch;
  material: Material;
  parts: Record<Outlet, Amount>;
  total: Amount;
  balanced: boolean;
}

/** 批次平衡：成品耗用和在制取自生产任务的实际用料，其余四项取自库存流水，合计和采购原量对账。 */
export function batchBalance(db: Db, batch: Batch): BatchBalance {
  const parts = Object.fromEntries(OUTLETS.map(o => [o, { mg: 0, count: 0 }])) as Record<Outlet, Amount>;
  for (const task of db.tasks) {
    for (const line of task.usage) {
      if (line.batch === batch.id) add(parts[task.status === '已完成' ? '成品耗用' : '在制'], line);
    }
  }
  for (const m of db.movements) if (m.batch === batch.id) add(parts[m.kind], m);
  const total: Amount = { mg: 0, count: 0 };
  for (const o of OUTLETS) add(total, parts[o]);
  const balanced = total.mg === (batch.qty.mg ?? 0) && total.count === (batch.qty.count ?? 0);
  return { batch, material: get(db.materials, batch.material), parts, total, balanced };
}

export type BatchStatus = '未领用' | '在制' | '待核对' | '已结清';

/** 有在制先算在制，再看有没有待核对；都没有且有成品耗用就是已结清（余料在库不影响）。 */
export function batchStatus({ parts }: BatchBalance): BatchStatus {
  const has = (o: Outlet) => parts[o].mg > 0 || parts[o].count > 0;
  if (has('在制')) return '在制';
  if (has('待核对')) return '待核对';
  return has('成品耗用') ? '已结清' : '未领用';
}

/** 单件成本：原料按类别拆开；工费只计已确认的，没确认的列进 pending，页面显示"待补"。 */
export interface Cost {
  byCategory: Record<string, number>;
  labor: number;
  total: number;
  pending: FeeKind[];
}

export function goodCost(db: Db, good: Good): Cost {
  const task = get(db.tasks, good.task);
  const byCategory: Record<string, number> = {};
  for (const line of task.usage) {
    const { category } = materialOf(db, line.batch);
    byCategory[category] = (byCategory[category] ?? 0) + lineCost(db, line);
  }
  const labor = sumBy(task.fees.filter(f => f.confirmed), f => f.fen);
  const pending = task.fees.filter(f => !f.confirmed).map(f => f.kind);
  return { byCategory, labor, total: sumBy(Object.values(byCategory), v => v) + labor, pending };
}

export interface Margin {
  price?: number;
  cost: number;
  margin?: number;
  /** 有没确认的费用或还在制的任务，成本待补 */
  pending: boolean;
}

/** 业务单毛利＝成交价－已确认成本（设计稿第 6 节）；还没成交价的不算毛利。 */
export function orderMargin(db: Db, order: Order): Margin {
  const costs = order.goods.map(id => goodCost(db, get(db.goods, id)));
  const fees = order.fees ?? [];
  const cost = sumBy(costs, c => c.total) + sumBy(fees.filter(f => f.confirmed), f => f.fen);
  const pending =
    costs.some(c => c.pending.length > 0) || fees.some(f => !f.confirmed) || db.tasks.some(t => t.order === order.id && t.status !== '已完成');
  return { price: order.price, cost, margin: order.price === undefined ? undefined : order.price - cost, pending };
}

export interface UsageRow {
  material: Material;
  qty: Amount;
  fen: number;
  /** 金额占比，0–1 */
  share: number;
}

/** 系列实际耗用：该系列已完成任务的实际用料，按原料汇总用量、金额和金额占比。 */
export function seriesUsage(db: Db, series: Series): UsageRow[] {
  const rows = new Map<string, UsageRow>();
  for (const task of db.tasks) {
    if (task.status !== '已完成' || get(db.styles, task.style).series !== series.id) continue;
    for (const line of task.usage) {
      const material = materialOf(db, line.batch);
      const row = rows.get(material.id) ?? { material, qty: { mg: 0, count: 0 }, fen: 0, share: 0 };
      add(row.qty, line);
      row.fen += lineCost(db, line);
      rows.set(material.id, row);
    }
  }
  const total = sumBy([...rows.values()], r => r.fen);
  return [...rows.values()].map(r => ({ ...r, share: total > 0 ? r.fen / total : 0 }));
}
```

- [ ] **Step 6: 运行检查，确认通过**

Run: `npm --prefix app run check`
Expected: `检查通过：路由、岗位、偏好、链接、数据、平衡、成本。`

- [ ] **Step 7: 类型检查**

Run: `npm --prefix app run build`
Expected: 通过。

- [ ] **Step 8: 提交**

```bash
git add app/scripts/checks/balance.ts app/scripts/checks/costs.ts app/scripts/check.ts app/src/data/calc.ts
git commit -m "feat(app): add batch balance, cost and margin calculations"
```

- [ ] **Step 9: 确认平衡检查能抓错**

把 `seed.ts` 里 LS-001 的 `mg: 5000` 临时改成 `mg: 4000`。
Run: `npm --prefix app run check`
Expected: FAIL，含 `PC-001 不平：原量 {"mg":100000}，去向合计 {"mg":99000,"count":0}` 和 `PC-001 应为 100g＝90＋5＋3＋2，实际 90000 4000 3000 2000 0 0`。
Run: `git checkout -- app/src/data/seed.ts`，再跑一次检查回到通过。

---

### Task 4: 通用组件

**Files:**
- Create: `app/src/ui/format.ts`
- Create: `app/src/ui/StatusTag.tsx`
- Create: `app/src/ui/Stat.tsx`
- Create: `app/src/ui/StageBar.tsx`
- Create: `app/src/ui/Timeline.tsx`
- Create: `app/src/ui/Section.tsx`
- Create: `app/src/ui/DataList.tsx`
- Create: `app/src/ui/Drawer.tsx`
- Create: `app/src/ui/MaterialBadge.tsx`
- Create: `app/src/ui/ShareBar.tsx`
- Create: `app/src/styles/ui.css`
- Modify: `app/src/styles/tokens.css`（两处）
- Modify: `app/src/main.tsx`

组件只管显示，不碰数据；状态色走 `tone-*` 类，两套主题共用。本任务没有页面用到它们，只验构建；Task 6 在浏览器里验。

- [ ] **Step 1: 写 `app/src/ui/format.ts`**

```ts
import type { Material, Measure, Qty } from '../data/model.ts';

function decimal(n: number, min: number, max: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: min, maximumFractionDigits: max });
}

/** 分 → "¥1,234.56"；负数 "−¥300.00" */
export function yuan(fen: number): string {
  return `${fen < 0 ? '−' : ''}¥${decimal(Math.abs(fen) / 100, 2, 2)}`;
}

/** 毫克 → "90 g"、"0.3 g"（精确到毫克，不补零） */
export function grams(mg: number): string {
  return `${decimal(mg / 1000, 0, 3)} g`;
}

/** 毫克 → "2.40 ct"（1 ct＝200 mg） */
export function carats(mg: number): string {
  return `${decimal(mg / 200, 2, 3)} ct`;
}

/** 按计量方式的一个维度显示：粒数／件数，或重量（宝石用克拉） */
export function dimText(measure: Measure, dim: 'mg' | 'count', n: number): string {
  if (dim === 'count') return `${n} ${measure === 'piece' ? '件' : '粒'}`;
  return measure === 'stone' ? carats(n) : grams(n);
}

/** 数量按计量方式显示："90 g"、"10 粒 / 0.50 ct"、"3 件" */
export function qtyText(measure: Measure, q: Qty): string {
  if (measure === 'weight') return grams(q.mg ?? 0);
  if (measure === 'piece') return dimText(measure, 'count', q.count ?? 0);
  return `${dimText(measure, 'count', q.count ?? 0)} / ${carats(q.mg ?? 0)}`;
}

const PRICE_UNIT: Record<Measure, string> = { weight: '克', stone: '克拉', piece: '件' };

/** 单价："¥780.00/克" */
export function priceText(measure: Measure, fen: number): string {
  return `${yuan(fen)}/${PRICE_UNIT[measure]}`;
}

/** 原料名带成色："足金（990‰）"；没有成色的只显示名称 */
export function materialLabel(m: Material): string {
  return m.fineness ? `${m.name}（${m.fineness}‰）` : m.name;
}
```

- [ ] **Step 2: 写 `app/src/ui/StatusTag.tsx`**

```tsx
import type { ReactNode } from 'react';

/** 状态色：两套主题各自校准，见 tokens.css */
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';

export function StatusTag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`tag tone-${tone}`}>{children}</span>;
}
```

- [ ] **Step 3: 写 `app/src/ui/Stat.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { Tone } from './StatusTag.tsx';

/** 指标卡；多张放进 <div className="stats"> 自动排列 */
export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <div className={tone ? `stat tone-${tone}` : 'stat'}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 4: 写 `app/src/ui/StageBar.tsx`**

```tsx
/** 阶段条：current 之前的为已完成，current 为当前阶段 */
export function StageBar({ stages, current }: { stages: readonly string[]; current: number }) {
  return (
    <ol className="stage-bar">
      {stages.map((stage, i) => (
        <li key={stage} className={i < current ? 'done' : undefined} aria-current={i === current ? 'step' : undefined}>
          {stage}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 5: 写 `app/src/ui/Timeline.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { Tone } from './StatusTag.tsx';

export interface TimelineItem {
  key: string;
  at: string;
  title: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
}

/** 时间线：按传入顺序显示，排序由调用方决定 */
export function Timeline({ items }: { items: readonly TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map(item => (
        <li key={item.key} className={item.tone ? `tone-${item.tone}` : undefined}>
          <time>{item.at}</time>
          <div>{item.title}</div>
          {item.detail && <div className="muted">{item.detail}</div>}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 6: 写 `app/src/ui/Section.tsx`**

```tsx
import { Fragment } from 'react';
import type { ReactNode } from 'react';

/** 详情分区：带标题的一块内容，extra 放在标题右侧（如状态标签） */
export function Section({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <header className="section-head">
        <h2>{title}</h2>
        {extra}
      </header>
      {children}
    </section>
  );
}

/** 字段表：[标签, 值] 两列 */
export function Fields({ items }: { items: ReadonlyArray<readonly [string, ReactNode]> }) {
  return (
    <dl className="fields">
      {items.map(([label, value]) => (
        <Fragment key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
```

- [ ] **Step 7: 写 `app/src/ui/DataList.tsx`**

```tsx
import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { useShell } from '../shell/ShellContext.ts';

export interface Column<T> {
  label: string;
  render: (row: T) => ReactNode;
  /** 数字列：桌面表格里右对齐 */
  num?: boolean;
}

/** 通用列表：桌面视图是表格，手机视图转成卡片（第一列做卡片标题）。页面只写列配置和数据。 */
export function DataList<T>({ columns, rows, rowKey, empty = '暂无记录' }: { columns: readonly Column<T>[]; rows: readonly T[]; rowKey: (row: T) => string; empty?: string }) {
  const { view } = useShell();
  if (rows.length === 0) return <p className="muted">{empty}</p>;

  if (view === 'phone') {
    const [head, ...rest] = columns;
    return (
      <ul className="cards">
        {rows.map(row => (
          <li key={rowKey(row)} className="card">
            <div className="card-title">{head.render(row)}</div>
            <dl>
              {rest.map(c => (
                <Fragment key={c.label}>
                  <dt>{c.label}</dt>
                  <dd>{c.render(row)}</dd>
                </Fragment>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.label} className={c.num ? 'num' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={rowKey(row)}>
              {columns.map(c => (
                <td key={c.label} className={c.num ? 'num' : undefined}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 8: 写 `app/src/ui/Drawer.tsx`**

```tsx
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
```

- [ ] **Step 9: 写 `app/src/ui/MaterialBadge.tsx`**

图标只按计量方式分三种，所以新原料不用改这里；色标颜色来自数据。

```tsx
import type { ReactNode } from 'react';
import type { Material, Measure } from '../data/model.ts';
import { materialLabel } from './format.ts';

/** 计量方式图标：按重量是砝码，按粒是宝石，按件是链扣 */
const ICONS: Record<Measure, ReactNode> = {
  weight: (
    <>
      <circle cx="8" cy="3.5" r="2" />
      <path d="M4.5 6.5h7l2 7.5h-11z" />
    </>
  ),
  stone: <path d="M4.5 2.5h7l3 3.5L8 14 1.5 6zM1.5 6h13" />,
  piece: (
    <>
      <rect x="1.5" y="5" width="8" height="6" rx="3" />
      <rect x="6.5" y="5" width="8" height="6" rx="3" />
    </>
  ),
};

/** 原料徽章：色标是原料本色（数据里的 swatch），图标按计量方式，新原料只填颜色就能显示。 */
export function MaterialBadge({ material }: { material: Material }) {
  return (
    <span className="material">
      <span className="swatch" style={{ background: material.swatch }} aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14">
          {ICONS[material.measure]}
        </svg>
      </span>
      {materialLabel(material)}
    </span>
  );
}
```

- [ ] **Step 10: 写 `app/src/ui/ShareBar.tsx`**

颜色跟着类别固定（`slot`），不按大小排；为零的段不画；精确数值由页面另用文字给出，色条只管一眼看比例。

```tsx
export interface Share {
  key: string;
  /** 类别色序号 1–6（tokens.css 的 --series-N），跟着类别固定，不按大小排 */
  slot: number;
  value: number;
  /** 图例上的名称 */
  name: string;
  /** 数值文字，用在悬停提示和读屏说明里 */
  text: string;
}

/** 占比色条：一条按比例分段的横条加图例；为零的段不画。精确数值由页面另用文字给出。 */
export function ShareBar({ shares, label }: { shares: readonly Share[]; label: string }) {
  const parts = shares.filter(s => s.value > 0);
  if (parts.length === 0) return null;
  return (
    <div className="share">
      <div className="share-bar" role="img" aria-label={`${label}：${parts.map(s => `${s.name} ${s.text}`).join('，')}`}>
        {parts.map(s => (
          <span key={s.key} title={`${s.name} ${s.text}`} style={{ flexGrow: s.value, background: `var(--series-${s.slot})` }} />
        ))}
      </div>
      <ul className="legend">
        {parts.map(s => (
          <li key={s.key}>
            <i style={{ background: `var(--series-${s.slot})` }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 11: `app/src/styles/tokens.css` 加图表类别色**

深色那组（`:root, :root[data-theme='dark']`）在 `--shadow: 0 12px 32px rgb(0 0 0 / 0.45);` 下面加：

```css
  /* 图表类别色：按固定顺序给类别，不按大小排；已用 dataviz 校验器对 --surface 校验（色盲区分、亮度、对比） */
  --series-1: #3987e5;
  --series-2: #d95926;
  --series-3: #199e70;
  --series-4: #c98500;
  --series-5: #d55181;
  --series-6: #008300;
```

浅色那组（`:root[data-theme='light']`）在 `--shadow: 0 12px 32px rgb(28 36 48 / 0.18);` 下面加：

```css
  /* 浅色下 3、4、5 号对白底不足 3:1，用到时必须旁边有文字数值或图例 */
  --series-1: #2a78d6;
  --series-2: #eb6834;
  --series-3: #1baf7a;
  --series-4: #eda100;
  --series-5: #e87ba4;
  --series-6: #008300;
```

- [ ] **Step 12: 写 `app/src/styles/ui.css`**

抽屉按 `.desktop-frame` 定位（Task 5 给它加 `position: relative`），所以不随列表滚动；宽度给侧栏留出 240px。

```css
/* 通用组件（src/ui/）。颜色只用 tokens.css 的变量，两套主题共用。 */

/* 状态色：tone-* 只设 --tone，标签、指标卡、时间线各自取用 */
.tone-ok { --tone: var(--ok); }
.tone-warn { --tone: var(--warn); }
.tone-bad { --tone: var(--bad); }
.tone-info { --tone: var(--info); }
.tone-muted { --tone: var(--text-2); }

/* 页面容器：手机里留边距，桌面主区和抽屉自带边距 */
.page { display: grid; gap: 12px; padding: 12px; }
.desktop-main .page { padding: 0; }

/* 详情分区 */
.section { min-width: 0; padding: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.section-head h2 { margin: 0; font-size: 15px; }
.fields { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 0; font-size: 13px; }
.fields dt { color: var(--text-2); }
.fields dd { margin: 0; }

/* 状态标签 */
.tag { display: inline-block; padding: 0 6px; border: 1px solid currentColor; border-radius: 4px; color: var(--tone, var(--text-2)); font-size: 12px; line-height: 18px; white-space: nowrap; }

/* 指标卡 */
.stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.stat { padding: 8px 10px; background: var(--surface-2); border-radius: 8px; }
.stat-label, .stat-hint { color: var(--text-2); font-size: 12px; }
.stat-value { color: var(--tone, var(--text)); font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }

/* 阶段条 */
.stage-bar { display: flex; gap: 4px; margin: 0 0 12px; padding: 0; list-style: none; }
.stage-bar li { flex: 1; padding-top: 4px; border-top: 3px solid var(--border); color: var(--text-2); font-size: 12px; text-align: center; }
.stage-bar .done { border-color: var(--ok); }
.stage-bar [aria-current='step'] { border-color: var(--link); color: var(--text); font-weight: 600; }

/* 时间线 */
.timeline { margin: 0; padding: 0 0 0 16px; list-style: none; }
.timeline li { position: relative; padding: 0 0 12px 12px; border-left: 2px solid var(--border); }
.timeline li:last-child { padding-bottom: 0; border-left-color: transparent; }
.timeline li::before { content: ''; position: absolute; top: 5px; left: -7px; width: 12px; height: 12px; background: var(--tone, var(--border)); border: 2px solid var(--surface); border-radius: 50%; }
.timeline time { color: var(--text-2); font-size: 12px; }

/* 通用列表：桌面表格 */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
.table th { color: var(--text-2); font-weight: 500; }
.table .num { text-align: right; font-variant-numeric: tabular-nums; }

/* 通用列表：手机卡片 */
.cards { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.card { padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; }
.card-title { margin-bottom: 4px; font-weight: 600; }
.card dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 0; font-size: 13px; }
.card dt { color: var(--text-2); }
.card dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }

/* 筛选条 */
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips button { padding: 2px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 999px; color: var(--text-2); font-size: 13px; cursor: pointer; }
.chips button[aria-pressed='true'] { border-color: var(--link); color: var(--link); }

/* 原料徽章：色标是原料本色，图标按计量方式 */
.material { display: inline-flex; align-items: center; gap: 6px; }
.swatch { flex: none; display: inline-grid; place-items: center; width: 22px; height: 22px; border: 1px solid var(--border); border-radius: 50%; color: rgb(0 0 0 / 0.62); }
.swatch svg { fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linejoin: round; }

/* 占比色条：段与段之间留 2px 底色缝，两端 4px 圆角 */
.share { margin: 4px 0 12px; }
.share-bar { display: flex; gap: 2px; height: 16px; }
.share-bar span { flex-basis: 0; min-width: 3px; }
.share-bar span:first-child { border-radius: 4px 0 0 4px; }
.share-bar span:last-child { border-radius: 0 4px 4px 0; }
.share-bar span:only-child { border-radius: 4px; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 6px 0 0; padding: 0; color: var(--text-2); font-size: 12px; list-style: none; }
.legend i { display: inline-block; width: 10px; height: 10px; margin-right: 4px; border-radius: 2px; vertical-align: -1px; }

/* 平衡式与警示 */
.equation { margin: 0 0 8px; font-variant-numeric: tabular-nums; }
.alert { margin: 0 0 8px; padding: 6px 10px; border: 1px solid var(--bad); border-radius: 8px; color: var(--bad); font-size: 13px; }

/* 桌面详情抽屉：定位在 .desktop-frame 上，不随列表滚动 */
.drawer { position: absolute; top: 0; right: 0; bottom: 0; z-index: 5; display: flex; flex-direction: column; width: min(480px, calc(100% - 240px)); background: var(--bg); border-left: 1px solid var(--border); box-shadow: var(--shadow); }
.drawer-head { flex: none; display: flex; justify-content: space-between; align-items: center; padding: 6px 8px 6px 16px; background: var(--surface); border-bottom: 1px solid var(--border); }
.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 16px 24px; }
```

- [ ] **Step 13: `app/src/main.tsx` 引入样式**

在 `import './styles/shell.css';` 下面加一行：

```ts
import './styles/ui.css';
```

- [ ] **Step 14: 检查与构建**

Run: `npm --prefix app run check`
Expected: `检查通过：路由、岗位、偏好、链接、数据、平衡、成本。`（链接规则会扫到新文件，里面没有手写 `#/`。）
Run: `npm --prefix app run build`
Expected: 通过。

- [ ] **Step 15: 提交**

```bash
git add app/src/ui app/src/styles/ui.css app/src/styles/tokens.css app/src/main.tsx
git commit -m "feat(app): add shared list, drawer, badge, share bar and timeline components"
```

---

### Task 5: 桌面详情抽屉接入外壳

**Files:**
- Modify: `app/src/pages/registry.ts`（整体替换）
- Modify: `app/src/shell/Screen.tsx`（整体替换）
- Modify: `app/src/shell/DesktopFrame.tsx`（整体替换）
- Modify: `app/src/styles/shell.css`（三处）

规则：桌面视图打开详情页时，如果它所属的列表页（`activeNavRoute`）已登记，主区显示列表、右侧抽屉显示详情，关闭抽屉就是回到列表地址；列表页还没做的照常整页。手机视图不变。

- [ ] **Step 1: 写 `app/src/pages/registry.ts`**

本步登记表还是空的，Task 6 再登记两页。

```ts
import type { ComponentType } from 'react';
import { activeNavRoute } from '../routes.ts';
import type { AppRoute, RouteMatch, RoutePath } from '../routes.ts';
import type { ViewMode } from '../shell/prefs.ts';

export interface PageProps {
  params: Record<string, string>;
}

/**
 * 路径 → 页面组件。还没实现的页面不登记，Screen 显示占位页。
 * 第 7 批收尾时改成 Record<RoutePath, …>，漏登记就编译失败。
 */
export const pages: Partial<Record<RoutePath, ComponentType<PageProps>>> = {};

/** 桌面视图下，详情页叠在所属列表页上、用右侧抽屉显示；所属列表页还没做时照常整页显示。 */
export function drawerParent(match: RouteMatch, view: ViewMode): AppRoute | undefined {
  if (view !== 'desktop' || !match.route.path.includes(':')) return undefined;
  const parent = activeNavRoute(match);
  return parent && pages[parent.path] ? parent : undefined;
}
```

- [ ] **Step 2: 写 `app/src/shell/Screen.tsx`**

`Drawer` 用 `params.id` 做 key，抽屉里换一条记录时滚动位置回到顶部。

```tsx
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
```

- [ ] **Step 3: 写 `app/src/shell/DesktopFrame.tsx`**

和第 1 批相比：导入 `drawerParent`；抽屉打开时主区标题显示列表页标题；只在主区换页时滚回顶部，开关抽屉不动列表。

```tsx
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { drawerParent } from '../pages/registry.ts';
import { activeNavRoute, landingHref, navHref, navRoutesOf } from '../routes.ts';
import type { RouteMatch } from '../routes.ts';
import { visibleModules } from '../roles.ts';
import { useShell } from './ShellContext.ts';

/** 模拟企微桌面端：左侧模块侧栏（当前模块展开子页面），右侧主区。企微形态下不显示侧栏。 */
export function DesktopFrame({ match, children }: { match: RouteMatch; children: ReactNode }) {
  const { role } = useShell();
  const mainRef = useRef<HTMLElement>(null);
  const { route } = match;
  const active = activeNavRoute(match);
  // 详情开在抽屉里时主区还是那张列表：开关抽屉、在抽屉里换记录都不把列表滚回顶部
  const parent = drawerParent(match, 'desktop');
  const scrollKey = parent ? navHref(parent) : window.location.hash;

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [scrollKey]);

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
          <h1>{(parent ?? route).title}</h1>
        </header>
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: 改 `app/src/styles/shell.css`**

第一处，`.stage-phone { … }` 这一行下面加：

```css
.stage-desktop { display: flex; }
```

第二处，把

```css
.desktop-frame { display: grid; grid-template-columns: 232px minmax(0, 1fr); height: 100%; background: var(--bg); }
```

改成

```css
.desktop-frame { position: relative; flex: 1; min-width: 0; display: grid; grid-template-columns: 232px minmax(0, 1fr); height: 100%; background: var(--bg); }
```

第三处，把

```css
.notes-desktop { position: absolute; top: 0; right: 0; bottom: 0; z-index: 10; overflow-y: auto; border-width: 0 0 0 1px; border-radius: 0; box-shadow: var(--shadow); }
```

改成

```css
/* 桌面视图：说明占右侧一栏，把桌面框往左挤，不盖住详情抽屉 */
.notes-desktop { overflow-y: auto; border-width: 0 0 0 1px; border-radius: 0; }
```

- [ ] **Step 5: 检查与构建**

Run: `npm --prefix app run check`
Expected: `检查通过：路由、岗位、偏好、链接、数据、平衡、成本。`
Run: `npm --prefix app run build`
Expected: 通过。

- [ ] **Step 6: 浏览器回归**

启动 `.claude/launch.json` 里的 `gold-crm-app`。窗口宽于 1024 时切到桌面视图，打开页面说明。
Expected: 说明在最右一栏，桌面框整体变窄、不被遮住；关掉说明后桌面框恢复全宽。手机视图和第 1 批一样。控制台无报错。

- [ ] **Step 7: 提交**

```bash
git add app/src/pages/registry.ts app/src/shell/Screen.tsx app/src/shell/DesktopFrame.tsx app/src/styles/shell.css
git commit -m "feat(app): open desktop detail pages in a drawer over their list"
```

---

### Task 6: 原料批次与批次详情两页

**Files:**
- Create: `app/src/pages/inventory/BatchList.tsx`
- Create: `app/src/pages/inventory/BatchDetail.tsx`
- Modify: `app/src/pages/registry.ts`（整体替换）

两页只用通用组件和 `calc.ts`：类别筛选项从数据里取，原料用徽章显示，平衡式按 `DIMS` 出行，色条按该计量方式的第一个维度画（宝石按粒数），数字全部来自推算函数，所以新原料不用改页面。

- [ ] **Step 1: 写 `app/src/pages/inventory/BatchList.tsx`**

```tsx
import { useState } from 'react';
import { batchBalance, batchStatus, get } from '../../data/calc.ts';
import type { BatchBalance, BatchStatus } from '../../data/calc.ts';
import { db } from '../../data/seed.ts';
import { detailHref } from '../../routes.ts';
import { DataList } from '../../ui/DataList.tsx';
import { priceText, qtyText } from '../../ui/format.ts';
import { MaterialBadge } from '../../ui/MaterialBadge.tsx';
import { StatusTag } from '../../ui/StatusTag.tsx';
import type { Tone } from '../../ui/StatusTag.tsx';

const STATUS_TONE: Record<BatchStatus, Tone> = { 未领用: 'muted', 在制: 'info', 待核对: 'warn', 已结清: 'ok' };

/** 批次状态标签；去向对不上原量时直接标"不平" */
export function BatchTag({ balance }: { balance: BatchBalance }) {
  if (!balance.balanced) return <StatusTag tone="bad">不平</StatusTag>;
  const status = batchStatus(balance);
  return <StatusTag tone={STATUS_TONE[status]}>{status}</StatusTag>;
}

const ALL = '全部';

/** 原料批次：来源、采购价和余量（按各自单位），可按原料类别筛选。类别从数据里取，新原料不用改这里。 */
export function BatchList() {
  const [category, setCategory] = useState(ALL);
  const all = db.batches.map(b => batchBalance(db, b));
  const categories = [ALL, ...new Set(all.map(b => b.material.category))];
  const rows = all.filter(b => category === ALL || b.material.category === category);
  return (
    <div className="page">
      <div className="chips" role="group" aria-label="原料类别">
        {categories.map(c => (
          <button key={c} type="button" aria-pressed={c === category} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <DataList
        rows={rows}
        rowKey={b => b.batch.id}
        columns={[
          { label: '批次', render: b => <a href={detailHref('/inventory/batches/:id', b.batch.id)}>{b.batch.id}</a> },
          { label: '原料', render: b => <MaterialBadge material={b.material} /> },
          { label: '来源', render: b => get(db.suppliers, b.batch.supplier).name },
          { label: '采购价', num: true, render: b => (b.batch.stones ? '逐粒计价' : priceText(b.material.measure, b.batch.price)) },
          { label: '原量', num: true, render: b => qtyText(b.material.measure, b.batch.qty) },
          { label: '余量', num: true, render: b => qtyText(b.material.measure, b.parts['余料']) },
          { label: '状态', render: b => <BatchTag balance={b} /> },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 2: 写 `app/src/pages/inventory/BatchDetail.tsx`**

去向记录里的任务、成品、库存流水链接先落到占位页，第 3 批补页面。

```tsx
import { batchBalance, batchStatus, get } from '../../data/calc.ts';
import type { BatchBalance, BatchStatus } from '../../data/calc.ts';
import { DIMS, OUTLETS } from '../../data/model.ts';
import type { Outlet } from '../../data/model.ts';
import { db } from '../../data/seed.ts';
import { detailHref, href } from '../../routes.ts';
import { DataList } from '../../ui/DataList.tsx';
import { carats, dimText, materialLabel, priceText, qtyText, yuan } from '../../ui/format.ts';
import { MaterialBadge } from '../../ui/MaterialBadge.tsx';
import { Fields, Section } from '../../ui/Section.tsx';
import { ShareBar } from '../../ui/ShareBar.tsx';
import { StageBar } from '../../ui/StageBar.tsx';
import { Stat } from '../../ui/Stat.tsx';
import type { Tone } from '../../ui/StatusTag.tsx';
import { Timeline } from '../../ui/Timeline.tsx';
import type { TimelineItem } from '../../ui/Timeline.tsx';
import type { PageProps } from '../registry.ts';
import { BatchTag } from './BatchList.tsx';

const STAGES = ['采购入库', '领用生产', '结清'];
const STAGE_OF: Record<BatchStatus, number> = { 未领用: 0, 在制: 1, 待核对: 1, 已结清: 2 };
const OUTLET_TONE: Partial<Record<Outlet, Tone>> = { 在制: 'info', 待核对: 'warn' };

/** 一个维度的平衡式："100 g ＝ 成品耗用 90 g ＋ 余料 5 g ＋ …"，只列不为零的去向 */
function Equation({ balance, dim }: { balance: BatchBalance; dim: 'mg' | 'count' }) {
  const { measure } = balance.material;
  const original = balance.batch.qty[dim] ?? 0;
  const terms = OUTLETS.filter(o => balance.parts[o][dim] > 0).map(o => `${o} ${dimText(measure, dim, balance.parts[o][dim])}`);
  return (
    <p className="equation">
      {dimText(measure, dim, original)} {original === balance.total[dim] ? '＝' : '≠'} {terms.join(' ＋ ') || dimText(measure, dim, 0)}
    </p>
  );
}

/** 批次详情：按该原料自己的单位平衡；宝石同时平衡粒数和重量，单粒主石列出证书号。 */
export function BatchDetail({ params }: PageProps) {
  const batch = db.batches.find(b => b.id === params.id);
  if (!batch) return <p className="page muted">找不到批次 {params.id}。</p>;
  const balance = batchBalance(db, batch);
  const { material, parts } = balance;
  const { measure } = material;
  const supplier = get(db.suppliers, batch.supplier);
  // 色条按该计量方式的第一个维度画：重量按毫克，宝石和配件按粒数、件数
  const dim = DIMS[measure][0];

  const usage = db.tasks.flatMap(task =>
    task.usage
      .filter(line => line.batch === batch.id)
      .map((line, i): TimelineItem => {
        const done = task.status === '已完成';
        const good = db.goods.find(g => g.task === task.id);
        return {
          key: `${task.id}-${i}`,
          at: task.at,
          tone: done ? undefined : 'info',
          title: (
            <>
              {done ? '成品耗用' : '在制'} {qtyText(measure, line)} · <a href={detailHref('/production/tasks/:id', task.id)}>{task.id}</a>
            </>
          ),
          detail: (
            <>
              {get(db.styles, task.style).name}
              {line.cert && ` · 证书 ${line.cert}`}
              {good && (
                <>
                  {' · 成品 '}
                  <a href={detailHref('/inventory/goods/:id', good.id)}>{good.id}</a>
                </>
              )}
            </>
          ),
        };
      }),
  );
  const moves = db.movements
    .filter(m => m.batch === batch.id)
    .map(
      (m): TimelineItem => ({
        key: m.id,
        at: m.at,
        tone: m.kind === '待核对' ? 'warn' : undefined,
        title: (
          <>
            {m.kind} {qtyText(measure, m)} · <a href={href('/inventory/movements')}>{m.id}</a>
          </>
        ),
        detail: m.note,
      }),
    );
  const records: TimelineItem[] = [{ key: 'in', at: batch.receivedAt, title: `采购入库 ${qtyText(measure, batch.qty)}`, detail: supplier.name }, ...usage, ...moves];
  records.sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="page">
      <Section title={`${batch.id} · ${materialLabel(material)}`} extra={<BatchTag balance={balance} />}>
        <StageBar stages={STAGES} current={STAGE_OF[batchStatus(balance)]} />
        <Fields
          items={[
            ['原料', <a href={href('/inventory/materials')}><MaterialBadge material={material} /></a>],
            ['类别', material.category],
            ['供应商', supplier.name],
            ['入库日期', batch.receivedAt],
            ['采购价', batch.stones ? `逐粒计价，均价 ${priceText(measure, batch.price)}` : priceText(measure, batch.price)],
            ['原量', qtyText(measure, batch.qty)],
          ]}
        />
      </Section>

      <Section title="平衡">
        {!balance.balanced && <p className="alert">去向合计对不上采购原量，核对库存流水和生产领料。</p>}
        {DIMS[measure].map(d => (
          <Equation key={d} balance={balance} dim={d} />
        ))}
        <ShareBar
          label={`${batch.id} 去向`}
          shares={OUTLETS.map((o, i) => ({ key: o, slot: i + 1, value: parts[o][dim], name: o, text: dimText(measure, dim, parts[o][dim]) }))}
        />
        <div className="stats">
          {OUTLETS.map(o => (
            <Stat key={o} label={o} value={qtyText(measure, parts[o])} tone={parts[o].mg > 0 || parts[o].count > 0 ? OUTLET_TONE[o] : undefined} />
          ))}
        </div>
      </Section>

      {batch.stones && (
        <Section title="单粒主石">
          <DataList
            rows={batch.stones}
            rowKey={s => s.cert}
            columns={[
              { label: '证书号', render: s => s.cert },
              { label: '重量', num: true, render: s => carats(s.mg) },
              { label: '采购价', num: true, render: s => yuan(s.fen) },
              {
                label: '去向',
                render: s => {
                  const task = db.tasks.find(t => t.usage.some(l => l.cert === s.cert));
                  return task ? (
                    <>
                      已领用 · <a href={detailHref('/production/tasks/:id', task.id)}>{task.id}</a>
                    </>
                  ) : (
                    '在库'
                  );
                },
              },
            ]}
          />
        </Section>
      )}

      <Section title="去向记录">
        <Timeline items={records} />
      </Section>
    </div>
  );
}
```

- [ ] **Step 3: 登记两页 `app/src/pages/registry.ts`**

```ts
import type { ComponentType } from 'react';
import { activeNavRoute } from '../routes.ts';
import type { AppRoute, RouteMatch, RoutePath } from '../routes.ts';
import type { ViewMode } from '../shell/prefs.ts';
import { BatchDetail } from './inventory/BatchDetail.tsx';
import { BatchList } from './inventory/BatchList.tsx';

export interface PageProps {
  params: Record<string, string>;
}

/**
 * 路径 → 页面组件。还没实现的页面不登记，Screen 显示占位页。
 * 第 7 批收尾时改成 Record<RoutePath, …>，漏登记就编译失败。
 */
export const pages: Partial<Record<RoutePath, ComponentType<PageProps>>> = {
  '/inventory/batches': BatchList,
  '/inventory/batches/:id': BatchDetail,
};

/** 桌面视图下，详情页叠在所属列表页上、用右侧抽屉显示；所属列表页还没做时照常整页显示。 */
export function drawerParent(match: RouteMatch, view: ViewMode): AppRoute | undefined {
  if (view !== 'desktop' || !match.route.path.includes(':')) return undefined;
  const parent = activeNavRoute(match);
  return parent && pages[parent.path] ? parent : undefined;
}
```

- [ ] **Step 4: 检查与构建**

Run: `npm --prefix app run check`
Expected: `检查通过：路由、岗位、偏好、链接、数据、平衡、成本。`
Run: `npm --prefix app run build`
Expected: 通过。

- [ ] **Step 5: 浏览器冒烟**

身份老板、手机视图，打开 `#/inventory/batches`。
Expected: 筛选条为"全部／贵金属／钻石／彩钻／工艺材料"；7 张卡片，原料带色标徽章，PC-001 显示"¥780.00/克、100 g、余量 5 g、已结清"；点 PC-001 进详情，平衡式为 `100 g ＝ 成品耗用 90 g ＋ 余料 5 g ＋ 回收料 3 g ＋ 确认损耗 2 g`，下面的色条分 4 段，图例同名。控制台无报错。

- [ ] **Step 6: 提交**

```bash
git add app/src/pages/inventory app/src/pages/registry.ts
git commit -m "feat(app): add material batch list and batch detail pages"
```

---

### Task 7: 第 2 批验收与推送

**Files:** 无新增；发现问题就地修，修完再跑一遍本任务。

- [ ] **Step 1: 自动检查（设计稿第 10 节第 6 条）**

Run: `npm --prefix app run check` → `检查通过：路由、岗位、偏好、链接、数据、平衡、成本。`
Run: `npm --prefix app run build` → 通过。

- [ ] **Step 2: 手机视图（身份老板，深色）**

| 地址 | 应看到 |
|---|---|
| `#/inventory/batches` | 7 张卡片，原料带色标徽章（金色、银灰、白钻近白、黄彩钻黄、珐琅蓝），图标按计量方式（金属和珐琅是砝码，钻石是宝石）；点"钻石"只剩 PC-004，点"全部"恢复 |
| `#/inventory/batches/PC-001` | 状态"已结清"，阶段条停在"结清"；`100 g ＝ 成品耗用 90 g ＋ 余料 5 g ＋ 回收料 3 g ＋ 确认损耗 2 g`；色条 4 段，悬停显示"成品耗用 90 g"等；去向记录 8 条，按日期从"采购入库"排到 LS-003 |
| `#/inventory/batches/PC-004` | 状态"待核对"；两行平衡式 `60 粒 ＝ 成品耗用 48 粒 ＋ 余料 10 粒 ＋ 确认损耗 1 粒 ＋ 待核对 1 粒`、`3.00 ct ＝ 成品耗用 2.40 ct ＋ 余料 0.50 ct ＋ 确认损耗 0.05 ct ＋ 待核对 0.05 ct`；"待核对"指标卡为警示色；色条按粒数分 4 段，1 粒的两段也看得见 |
| `#/inventory/batches/PC-005` | 采购价"逐粒计价，均价 ¥33,750.00/克拉"；单粒主石两行：ZS-2026-0101 已领用 · RW-008，ZS-2026-0102 在库 |
| `#/inventory/batches/PC-002` | 状态"在制"；`50 g ＝ 余料 29.7 g ＋ 在制 20 g ＋ 待核对 0.3 g` |
| `#/inventory/batches/PC-999` | "找不到批次 PC-999。" |

每页在控制台执行 `(e => e.scrollWidth <= e.clientWidth)(document.querySelector('.phone-content'))`，结果为 `true`（无横向滚动）。点去向记录里的 RW-001、CP-001、LS-001 链接，分别进到任务详情、成品详情、库存流水的占位页。

- [ ] **Step 3: 桌面视图（窗口宽于 1024，先看 `innerWidth`）**

- 打开 `#/inventory/batches`：表格 7 行，数字列右对齐。
- 点 PC-004：主区仍是列表、标题"原料批次"，右侧抽屉显示批次详情；侧栏"原料批次"保持高亮。
- 在抽屉里点"关闭详情"：回到 `#/inventory/batches`，抽屉消失。
- 打开页面说明：说明在最右一栏，抽屉右边缘不超过说明左边缘（在控制台比较两者 `getBoundingClientRect()`）。
- 抽屉里 PC-005 的单粒主石显示为表格，窄时可横向滚动，不撑破抽屉。

- [ ] **Step 4: 主题与岗位**

- 深、浅两套主题下，标签、指标卡、阶段条、时间线圆点、色条各段颜色都能分清，文字可读；白钻配石的近白色标在浅色主题下有边线、看得出来。
- 身份切到会计，打开 `#/inventory/batches` → "本岗位看不到这个模块"。
- 切到采购 → 页面顶部"本岗位范围：原料目录、供应商、采购单、批次"；切到门店顾问 → "本岗位范围：可售成品"。

- [ ] **Step 5: 注入铂金（设计稿第 10 节第 9 条）**

在 `app/src/data/seed.ts` 三个数组末尾各临时加一条：

```ts
// materials 末尾
  { id: 'YL-011', name: '铂金', category: '贵金属', measure: 'weight', swatch: '#dcdfe2', fineness: 950, refPrice: 30000, priceSource: '临时注入', lossRate: 5 },
// batches 末尾
  { id: 'PC-008', material: 'YL-011', supplier: 'GY-001', receivedAt: '2026-10-12', qty: { mg: 10000 }, price: 29000 },
// movements 末尾
  { id: 'LS-015', batch: 'PC-008', kind: '余料', mg: 10000, at: '2026-10-12', note: '临时注入' },
```

Run: `npm --prefix app run check` → 仍是 `检查通过：…`。
浏览器：批次列表多出 PC-008"铂金（950‰）、¥290.00/克、10 g、余量 10 g、未领用"，徽章是浅灰色标加砝码图标，"贵金属"筛选里有它；详情平衡式 `10 g ＝ 余料 10 g`，色条只有"余料"一段，阶段条停在"采购入库"。页面代码没改。原料目录和用料表两页在第 3 批，届时再做一次同样的注入。
Run: `git checkout -- app/src/data/seed.ts`，再跑一次检查回到通过。

- [ ] **Step 6: 控制台**

Expected: 以上操作全程控制台没有报错。

- [ ] **Step 7: 推送**

Run: `git push origin claude/clickable-prototype`
Expected: 推送成功；`git rev-parse HEAD` 与 `git rev-parse origin/claude/clickable-prototype` 一致。

- [ ] **Step 8: 记录**

按三问更新项目记忆（当前进度：第 2 批完成、提交号、下一步写第 3 批计划；数据口径有变化的写进项目地图），提交并推送记忆库。
