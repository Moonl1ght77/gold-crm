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
