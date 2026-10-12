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
