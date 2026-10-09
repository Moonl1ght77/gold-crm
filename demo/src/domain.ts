import type { CRMState, Command, Order, Product, Receipt, Role, Settings, Usage } from './types.ts';

export const STORAGE_KEY = 'gold-crm-demo-v1';
const roles: Role[] = ['经营负责人','门店顾问','品牌运营','产品设计','采购仓库','工厂质检','财务','管理员'];
const pages = ['home','customers','orders','aftercare','products','inventory','factory','marketing','finance','analytics','market','system'];
const now = () => new Date().toISOString();
export const businessDay = (iso: string) => new Date(Date.parse(iso) + 8 * 3600000).toISOString().slice(0,10);
function ensure(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
function required(value: unknown, name: string): string { ensure(typeof value === 'string' && value.trim(), `${name}不能为空`); return value.trim(); }
function integer(value: unknown, name: string, signed = false): number { ensure(typeof value === 'number' && Number.isSafeInteger(value) && (signed || value >= 0), `${name}须为${signed ? '' : '非负'}安全整数`); return value; }
function choice<T extends string>(value: unknown, values: readonly T[], name: string): T { ensure(values.includes(value as T), `${name}无效`); return value as T; }
function boolean(value: unknown, name: string): boolean { ensure(typeof value === 'boolean', `${name}须为是或否`); return value; }
function day(value: unknown, name: string): string { const text = required(value,name); ensure(/^\d{4}-\d{2}-\d{2}$/.test(text) && new Date(`${text}T00:00:00Z`).toISOString().slice(0,10) === text, `${name}格式无效`); return text; }
function sum(values: number[], name = '合计'): number { return integer(values.reduce((a,b) => a+b,0),name,true); }
function find<T extends {id:string}>(items: T[], id: unknown, name: string): T { const item = items.find(item => item.id === required(id,name)); ensure(item, `${name}不存在`); return item; }
function materialCost(quantityMg: number, unitCostCents: number): number { const total=integer(quantityMg*unitCostCents,'材料计价乘积'); return integer(Math.round(total / 1000),'材料成本'); }

export function formatMoney(cents: number): string { return Number.isFinite(cents) ? `¥${(cents / 100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—'; }
export function formatWeight(mg: number): string { return Number.isFinite(mg) ? `${(mg / 1000).toLocaleString('zh-CN',{minimumFractionDigits:3,maximumFractionDigits:3})} g` : '—'; }
export function batchAvailable(state: CRMState, batchId: string): number { find(state.batches,batchId,'批次'); return sum(state.movements.filter(m => m.batchId === batchId).map(m => m.quantityMg),'库存'); }
export function orderCost(state: CRMState, orderId: string): number {
  const order = find(state.orders,orderId,'订单');
  const product = find(state.products,order.productId,'商品');
  const version = product.versions.find(v => v.version === order.designVersion);
  ensure(version, '订单设计版本不存在');
  return sum([
    ...state.usages.filter(u => u.orderId === orderId).map(u => materialCost(u.netMg + (u.lossConfirmed ? u.lossMg : 0),find(state.batches,u.batchId,'批次').unitCostCents)),
    ...state.expenses.filter(e => e.orderId === orderId).map(e => e.amountCents),
    version.accessoryCents, version.salesFeeCents,
  ],'订单成本');
}
export function orderBalance(state: CRMState, orderId: string): {receivedCents:number;refundedCents:number;pendingCents:number;dueCents:number} {
  const order = find(state.orders,orderId,'订单');
  const records = state.receipts.filter(r => r.orderId === orderId);
  const receivedCents = sum(records.filter(r => r.verified && r.kind === '收款').map(r => r.amountCents),'已收金额');
  const refundedCents = sum(records.filter(r => r.verified && r.kind === '退款').map(r => r.amountCents),'已退金额');
  const pendingCents = sum(records.filter(r => !r.verified).map(r => r.kind === '收款' ? r.amountCents : -r.amountCents),'待核验净额');
  return {receivedCents,refundedCents,pendingCents,dueCents:Math.max(0,order.quoteCents-(receivedCents-refundedCents))};
}

export function createSeed(): CRMState {
  const at = '2026-10-10T02:00:00.000Z';
  const products: Product[] = [
    {id:'p1',name:'流光素圈戒指',series:'日常佩戴',designVersion:'R1.2',purity:'足金999',goldMg:9200,accessoryCents:16000,processingCents:68000,salesFeeCents:28000,status:'已确认',versions:[{version:'R1.1',at:'2026-09-28T02:00:00.000Z',goldMg:9000,accessoryCents:16000,processingCents:62000,salesFeeCents:28000},{version:'R1.2',at,goldMg:9200,accessoryCents:16000,processingCents:68000,salesFeeCents:28000}]},
    {id:'p2',name:'如意云纹吊坠',series:'东方纹样',designVersion:'P2.1',purity:'足金999',goldMg:15000,accessoryCents:24000,processingCents:88000,salesFeeCents:42000,status:'已确认',versions:[]},
    {id:'p3',name:'竹节传承手镯',series:'传承金饰',designVersion:'B1.0',purity:'足金999',goldMg:28000,accessoryCents:0,processingCents:120000,salesFeeCents:60000,status:'已确认',versions:[]},
    {id:'p4',name:'星轨双环耳饰',series:'轻定制',designVersion:'E0.3',purity:'足金999',goldMg:7000,accessoryCents:32000,processingCents:80000,salesFeeCents:30000,status:'草稿',versions:[]},
    {id:'p5',name:'月影银链',series:'银饰现货',designVersion:'S1.0',purity:'S925',goldMg:0,accessoryCents:18000,processingCents:12000,salesFeeCents:8000,status:'已确认',versions:[]},
  ];
  for (const p of products) if (!p.versions.length) p.versions.push({version:p.designVersion,at,goldMg:p.goldMg,accessoryCents:p.accessoryCents,processingCents:p.processingCents,salesFeeCents:p.salesFeeCents});
  const orders: Order[] = [
    {id:'o1',number:'JC-261010-001',customerId:'c1',productId:'p1',channel:'门店',kind:'定制',quoteCents:938000,goldQuoteCents:83500,designVersion:'R1.2',quoteVersion:2,quoteHistory:[{version:1,amountCents:906000,designVersion:'R1.1',at:'2026-10-05T02:00:00.000Z'},{version:2,amountCents:938000,designVersion:'R1.2',at}],createdAt:'2026-10-05T02:00:00.000Z',dueDate:'2026-10-16',production:'制作中',delivery:'未交付',status:'已确认',qualityNotes:[]},
    {id:'o2',number:'JC-261008-002',customerId:'c2',productId:'p2',channel:'小程序',kind:'定制',quoteCents:1510000,goldQuoteCents:83000,designVersion:'P2.1',quoteVersion:1,quoteHistory:[],createdAt:'2026-10-08T02:00:00.000Z',dueDate:'2026-10-14',production:'返工中',delivery:'未交付',status:'已确认',externalId:'WX-1001',qualityNotes:['2026-10-09 初检未通过：云纹边缘需修整']},
    {id:'o3',number:'JC-261004-003',customerId:'c3',productId:'p1',channel:'门店',kind:'定制',quoteCents:938000,goldQuoteCents:82800,designVersion:'R1.2',quoteVersion:1,quoteHistory:[],createdAt:'2026-10-04T02:00:00.000Z',dueDate:'2026-10-11',production:'已合格',delivery:'未交付',status:'已确认',qualityNotes:['2026-10-09 重量、外观复核合格']},
    {id:'o4',number:'JC-261001-004',customerId:'c4',productId:'p3',channel:'门店',kind:'定制',quoteCents:2680000,goldQuoteCents:82200,designVersion:'B1.0',quoteVersion:1,quoteHistory:[],createdAt:'2026-10-01T02:00:00.000Z',dueDate:'2026-10-08',production:'已合格',delivery:'已交付',status:'已确认',qualityNotes:['2026-10-07 质检合格；2026-10-08 顾客签收']},
    {id:'o5',number:'JC-261010-005',customerId:'c5',productId:'p5',channel:'社群',kind:'现货',quoteCents:68000,goldQuoteCents:83500,designVersion:'S1.0',quoteVersion:1,quoteHistory:[],createdAt:at,dueDate:'2026-10-12',production:'待排产',delivery:'未交付',status:'待确认',qualityNotes:[]},
    {id:'o6',number:'JC-260930-006',customerId:'c2',productId:'p4',channel:'门店',kind:'定制',quoteCents:1100000,goldQuoteCents:82000,designVersion:'E0.3',quoteVersion:1,quoteHistory:[],createdAt:'2026-09-30T02:00:00.000Z',dueDate:'2026-10-09',production:'制作中',delivery:'未交付',status:'已取消',qualityNotes:['2026-10-06 顾客取消，保留已发生费用与用料账']},
  ];
  for (const o of orders) if (!o.quoteHistory.length) o.quoteHistory.push({version:1,amountCents:o.quoteCents,designVersion:o.designVersion,at:o.createdAt});
  const usages: Usage[] = [
    {id:'u1',orderId:'o1',batchId:'b1',issuedMg:11200,netMg:0,returnedMg:1000,recoveredMg:200,lossMg:0,lossConfirmed:false,at},
    {id:'u2',orderId:'o2',batchId:'b1',issuedMg:18000,netMg:15000,returnedMg:1500,recoveredMg:600,lossMg:900,lossConfirmed:true,at},
    {id:'u3',orderId:'o3',batchId:'b1',issuedMg:10000,netMg:9200,returnedMg:400,recoveredMg:250,lossMg:150,lossConfirmed:true,at},
    {id:'u4',orderId:'o4',batchId:'b2',issuedMg:30000,netMg:28000,returnedMg:1200,recoveredMg:500,lossMg:300,lossConfirmed:true,at},
    {id:'u6',orderId:'o6',batchId:'b2',issuedMg:12000,netMg:7000,returnedMg:4000,recoveredMg:600,lossMg:400,lossConfirmed:true,at},
  ];
  const movements: CRMState['movements'] = [
    {id:'m-b1',batchId:'b1',kind:'入库',quantityMg:500000,reason:'虚构采购入库',at:'2026-09-28T02:00:00.000Z'},
    {id:'m-b2',batchId:'b2',kind:'入库',quantityMg:280000,reason:'虚构采购入库',at:'2026-09-30T02:00:00.000Z'},
    {id:'m-b3',batchId:'b3',kind:'入库',quantityMg:1000000,reason:'虚构银料入库',at:'2026-10-03T02:00:00.000Z'},
  ];
  for (const u of usages) { movements.push({id:`m-issue-${u.id}`,batchId:u.batchId,orderId:u.orderId,kind:'领料',quantityMg:-u.issuedMg,reason:'订单领料',at:u.at}); if(u.returnedMg) movements.push({id:`m-return-${u.id}`,batchId:u.batchId,orderId:u.orderId,kind:'退料',quantityMg:u.returnedMg,reason:'可用退料归原批次；回收另记',at:u.at}); }
  const history = Array.from({length:16},(_,i) => ({at:`2026-10-10T01:${String(i*3).padStart(2,'0')}:00.000Z`,goldCents:83500+[-120,-80,40,100,80,140,200,160,100,40,-20,-80,-40,20,60,0][i],silverCents:1010+[0,2,5,3,7,9,6,3,0,-3,-2,1,2,0,-1,0][i]}));
  return {
    version:1,products,orders,usages,movements,
    customers:[
      {id:'c1',name:'林予安（虚构）',phone:'13800001001',source:'门店自然到访',advisor:'陈顾问',stage:'已成交',member:true,notes:[{id:'f1',at,text:'确认戒围及刻字，已发送设计R1.2',nextDate:'2026-10-13'}]},
      {id:'c2',name:'周明月（虚构）',phone:'13800001002',source:'小程序',advisor:'陈顾问',stage:'已成交',member:true,notes:[{id:'f2',at,text:'同步云纹返工说明，周末到店查看',nextDate:'2026-10-12'}]},
      {id:'c3',name:'许知夏（虚构）',phone:'13800001003',source:'老客介绍',advisor:'王顾问',stage:'已成交',member:true,notes:[]},
      {id:'c4',name:'陈嘉禾（虚构）',phone:'13800001004',source:'门店',advisor:'王顾问',stage:'已成交',member:true,notes:[]},
      {id:'c5',name:'赵星宁（虚构）',phone:'13800001005',source:'秋日焕新活动',advisor:'陈顾问',stage:'跟进中',member:false,notes:[]},
      {id:'c6',name:'吴雨桐（虚构）',phone:'13800001006',source:'品牌内容',advisor:'王顾问',stage:'新线索',member:false,notes:[]},
    ],
    batches:[{id:'b1',material:'黄金',purity:'足金999',source:'演示供应商甲',unitCostCents:71600,location:'原料库A',receivedAt:'2026-09-28T02:00:00.000Z'},{id:'b2',material:'黄金',purity:'足金999',source:'演示供应商乙',unitCostCents:72100,location:'原料库B',receivedAt:'2026-09-30T02:00:00.000Z'},{id:'b3',material:'白银',purity:'S925',source:'演示供应商丙',unitCostCents:860,location:'银料库',receivedAt:'2026-10-03T02:00:00.000Z'}],
    expenses:[{id:'e1',orderId:'o1',type:'加工',amountCents:68000,reason:'戒指基础加工',at},{id:'e2',orderId:'o2',type:'加工',amountCents:88000,reason:'吊坠雕纹加工',at},{id:'e3',orderId:'o2',type:'返工',amountCents:18000,reason:'云纹边缘修整',at},{id:'e4',orderId:'o3',type:'加工',amountCents:68000,reason:'戒指基础加工',at},{id:'e5',orderId:'o4',type:'加工',amountCents:120000,reason:'手镯加工',at},{id:'e6',orderId:'o6',type:'加工',amountCents:80000,reason:'取消前已发生加工费',at}],
    receipts:[{id:'r1',orderId:'o1',kind:'收款',amountCents:300000,method:'银行卡',verified:true,note:'演示定金已核验',at},{id:'r2',orderId:'o1',kind:'收款',amountCents:100000,method:'微信',verified:false,note:'补充定金待财务核验',at},{id:'r3',orderId:'o2',kind:'收款',amountCents:500000,method:'微信',verified:true,note:'演示定金',at},{id:'r4',orderId:'o3',kind:'收款',amountCents:900000,method:'银行卡',verified:true,note:'演示已收款',at},{id:'r5',orderId:'o4',kind:'收款',amountCents:2680000,method:'银行卡',verified:true,note:'演示全款已核验',at},{id:'r6',orderId:'o6',kind:'收款',amountCents:400000,method:'微信',verified:true,note:'取消前定金',at},{id:'r7',orderId:'o6',kind:'退款',amountCents:350000,method:'微信',verified:true,note:'已核验退款；费用结算待讨论',at}],
    campaigns:[{id:'cam1',name:'秋日焕新',channel:'社群',budgetCents:500000,status:'进行中',customerIds:['c5']},{id:'cam2',name:'东方纹样新品',channel:'品牌内容',budgetCents:800000,status:'草稿',customerIds:['c6']}],
    cases:[{id:'case1',orderId:'o2',type:'变更',reason:'顾客要求纹样边缘更圆润',status:'处理中',result:'返工费用已登记，待复检',at},{id:'case2',orderId:'o4',type:'维修',reason:'佩戴后松紧调整咨询',status:'待处理',result:'',at},{id:'case3',orderId:'o6',type:'取消',reason:'顾客预算变化',status:'已关闭',result:'订单已取消，退款核验记录保留',at}],
    todos:[{id:'t1',title:'确认林予安刻字与交期',owner:'门店顾问',page:'orders',entityId:'o1',done:false,dueDate:'2026-10-11'},{id:'t2',title:'周明月返工完成后复检',owner:'工厂质检',page:'factory',entityId:'o2',done:false,dueDate:'2026-10-12'},{id:'t3',title:'核验林予安补充定金',owner:'财务',page:'finance',entityId:'r2',done:false,dueDate:'2026-10-10'},{id:'t4',title:'邀请许知夏到店取货',owner:'门店顾问',page:'orders',entityId:'o3',done:false,dueDate:'2026-10-11'},{id:'t5',title:'评审星轨耳饰草稿',owner:'产品设计',page:'products',entityId:'p4',done:false,dueDate:'2026-10-13'},{id:'t6',title:'复核原料库A库存账',owner:'采购仓库',page:'inventory',entityId:'b1',done:false,dueDate:'2026-10-12'},{id:'t7',title:'跟进秋日焕新线索',owner:'品牌运营',page:'marketing',entityId:'cam1',done:false,dueDate:'2026-10-11'},{id:'t8',title:'确认接口与岗位负责人',owner:'经营负责人',page:'system',done:false,dueDate:'2026-10-15'},{id:'t9',title:'检查演示数据存储',owner:'管理员',page:'system',done:true,dueDate:'2026-10-10'}],
    audits:[{id:'a-seed',at,actor:'管理员',action:'初始化演示',summary:'虚构客户、订单、库存及财务记录；行业计价待商家核实'}],
    apiLogs:[{id:'api-seed',at,path:'/mock/orders',method:'GET',status:200,message:'演示连接就绪；WX-1001已关联本地订单'}],
    externalOrders:[{externalId:'WX-1001',customerName:'周明月（虚构）',productId:'p2',quoteCents:1510000,dueDate:'2026-10-14'},{externalId:'WX-1002',customerName:'顾清和（虚构）',productId:'p1',quoteCents:956000,dueDate:'2026-10-20'}],
    marketHistory:history,settings:{storeName:'金序 · 概念门店',role:'经营负责人',marketRunning:true,goldCents:83500,silverCents:1010,tick:0,integrationEnabled:true},
  };
}

function openOrder(state: CRMState, id: string): Order { const o = find(state.orders,id,'订单'); ensure(o.status !== '已取消','已取消订单不能继续该操作'); ensure(o.delivery !== '已交付','已交付订单请走售后流程'); return o; }
function receiptLimits(state: CRMState, orderId: string): void {
  const order = find(state.orders,orderId,'订单');
  const records = state.receipts.filter(r => r.orderId === orderId);
  const collected = sum(records.filter(r => r.kind === '收款').map(r => r.amountCents),'收款预留');
  const verifiedRefunds = sum(records.filter(r => r.kind === '退款' && r.verified).map(r => r.amountCents),'已退金额');
  const verifiedIncome = sum(records.filter(r => r.kind === '收款' && r.verified).map(r => r.amountCents),'已收金额');
  const refunds = sum(records.filter(r => r.kind === '退款').map(r => r.amountCents),'退款预留');
  ensure(collected-verifiedRefunds <= order.quoteCents,'收款含待核验预留不能超过订单报价');
  ensure(refunds <= verifiedIncome,'退款含待核验预留不能超过已核验收款');
}

export function applyCommand(state: CRMState, command: Command): CRMState {
  ensure(command && typeof command === 'object','操作无效');
  if (command.type === 'RESET') return createSeed();
  const next = structuredClone(state);
  const at = now();
  let serial = sum([next.customers.length,next.products.length,next.orders.length,next.movements.length,next.usages.length,next.expenses.length,next.receipts.length,next.campaigns.length,next.cases.length,next.todos.length,next.audits.length,next.apiLogs.length]);
  const id = (prefix: string) => `${prefix}-${++serial}`;
  let summary = ''; let entityId: string | undefined;
  const audit = () => { next.audits.push({id:id('audit'),at,actor:next.settings.role,action:command.type,entityId,summary}); };
  const newOrder = (payload: Extract<Command,{type:'CREATE_ORDER'}>['payload'], externalId?: string) => {
    const customer = find(next.customers,payload.customerId,'客户');
    const product = find(next.products,payload.productId,'商品');
    ensure(product.status === '已确认','商品设计须先确认');
    const quoteCents = integer(payload.quoteCents,'报价'); ensure(quoteCents > 0,'报价须大于0');
    const orderId = id('order');
    const order: Order = {id:orderId,number:`JC-${businessDay(at).slice(2).replaceAll('-','')}-${String(serial).padStart(3,'0')}`,customerId:customer.id,productId:product.id,channel:required(payload.channel,'渠道'),kind:choice(payload.kind,['现货','定制'],'订单类型'),quoteCents,goldQuoteCents:next.settings.goldCents,designVersion:product.designVersion,quoteVersion:1,quoteHistory:[{version:1,amountCents:quoteCents,designVersion:product.designVersion,at}],createdAt:at,dueDate:day(payload.dueDate,'交期'),production:'待排产',delivery:'未交付',status:'待确认',qualityNotes:[],...(externalId ? {externalId} : {})};
    next.orders.push(order); entityId = order.id;
    next.todos.push({id:id('todo'),title:`确认订单 ${order.number}`,owner:'门店顾问',page:'orders',entityId:order.id,done:false,dueDate:order.dueDate});
    return order;
  };
  switch(command.type) {
    case 'SAVE_CUSTOMER': {
      const p = command.payload; const old = p.id ? find(next.customers,p.id,'客户') : undefined;
      const customer = {id:old?.id ?? id('customer'),name:required(p.name,'客户姓名'),phone:required(p.phone,'电话'),source:required(p.source,'来源'),advisor:required(p.advisor,'跟进顾问'),stage:choice(p.stage,['新线索','跟进中','已成交'],'客户阶段'),member:boolean(p.member,'会员身份'),notes:old?.notes ?? []};
      if(old) Object.assign(old,customer); else next.customers.push(customer); entityId=customer.id; summary=`${old ? '更新' : '新增'}客户 ${customer.name}`; break;
    }
    case 'ADD_FOLLOWUP': {
      const p=command.payload; const customer=find(next.customers,p.customerId,'客户'); customer.notes.push({id:id('followup'),at,text:required(p.text,'跟进内容'),nextDate:day(p.nextDate,'下次跟进日期')}); entityId=customer.id; summary=`登记 ${customer.name} 跟进`; break;
    }
    case 'SAVE_PRODUCT': {
      const p=command.payload; const old=p.id ? find(next.products,p.id,'商品') : undefined;
      const version=required(p.designVersion,'设计版本');
      const data={name:required(p.name,'商品名称'),series:required(p.series,'系列'),designVersion:version,purity:required(p.purity,'成色'),goldMg:integer(p.goldMg,'黄金净重'),accessoryCents:integer(p.accessoryCents,'辅材费'),processingCents:integer(p.processingCents,'加工费'),salesFeeCents:integer(p.salesFeeCents,'销售费'),status:choice(p.status,['草稿','已确认'],'设计状态')};
      const prior=old?.versions.find(v=>v.version===version);
      if(prior) ensure(prior.goldMg===data.goldMg && prior.accessoryCents===data.accessoryCents && prior.processingCents===data.processingCents && prior.salesFeeCents===data.salesFeeCents,'修改重量或费用须使用新设计版本，旧版不能覆盖');
      const versions=old?.versions ?? []; if(!prior) versions.push({version,at,goldMg:data.goldMg,accessoryCents:data.accessoryCents,processingCents:data.processingCents,salesFeeCents:data.salesFeeCents});
      if(old) Object.assign(old,data); else next.products.push({id:id('product'),...data,versions}); entityId=old?.id ?? next.products.at(-1)!.id; summary=`保存设计 ${data.name} · ${version}`; break;
    }
    case 'CREATE_ORDER': { newOrder(command.payload); summary='创建待确认订单与顾问待办'; break; }
    case 'REQUOTE_ORDER': {
      const p=command.payload; const o=openOrder(next,p.orderId); const amount=integer(p.quoteCents,'报价'); ensure(amount>0,'报价须大于0');
      const product=find(next.products,o.productId,'商品'); const version=required(p.designVersion,'设计版本'); ensure(product.versions.some(v=>v.version===version),'设计版本不存在');
      if(version!==o.designVersion) ensure(o.production==='待排产','开始制作后变更设计须另行处理售后');
      ensure(o.quoteCents!==amount || o.designVersion!==version,'报价与设计版本没有变化');
      o.quoteCents=amount;o.designVersion=version;o.quoteVersion=integer(o.quoteVersion+1,'报价版本');o.quoteHistory.push({version:o.quoteVersion,amountCents:amount,designVersion:version,at}); receiptLimits(next,o.id); entityId=o.id; summary=`保留报价第${o.quoteVersion}版`;break;
    }
    case 'CONFIRM_ORDER': { const o=openOrder(next,command.payload.orderId); ensure(o.status==='待确认','订单已确认');o.status='已确认';find(next.customers,o.customerId,'客户').stage='已成交'; entityId=o.id;summary='订单已确认，生产与付款状态独立'; break; }
    case 'START_PRODUCTION': { const o=openOrder(next,command.payload.orderId);ensure(o.status==='已确认','订单须先确认');ensure(o.production==='待排产','订单已进入生产流程');ensure(o.kind==='定制','现货订单请直接检查后交付');o.production='制作中';entityId=o.id;summary='订单开始制作';break; }
    case 'DELIVER_ORDER': { const o=openOrder(next,command.payload.orderId);ensure(o.status==='已确认','订单须先确认');ensure(o.production==='已合格','质检或复检合格后才能交付');o.delivery='已交付';entityId=o.id;summary='订单已交付，收款记录保持独立';break; }
    case 'CANCEL_ORDER': { const o=openOrder(next,command.payload.orderId);o.status='已取消';o.qualityNotes.push(`${at.slice(0,10)} 订单取消，保留既有用料、费用及收退款记录`);entityId=o.id;summary='订单已取消，既有费用未删除';break; }
    case 'SAVE_USAGE': {
      const p=command.payload;const o=openOrder(next,p.orderId);ensure(o.status==='已确认','订单须先确认');ensure(['制作中','待质检','返工中'].includes(o.production),'请先开始制作后登记用料');const batch=find(next.batches,p.batchId,'批次');
      const old=next.usages.find(u=>u.orderId===o.id && u.batchId===batch.id);
      const data={orderId:o.id,batchId:batch.id,issuedMg:integer(p.issuedMg,'领料'),netMg:integer(p.netMg,'净重'),returnedMg:integer(p.returnedMg,'返料'),recoveredMg:integer(p.recoveredMg,'回收'),lossMg:integer(p.lossMg,'损耗'),lossConfirmed:boolean(p.lossConfirmed,'损耗确认')};
      ensure(data.issuedMg>0,'领料须大于0');const settled=sum([data.netMg,data.returnedMg,data.recoveredMg,data.lossMg],'用料合计');ensure(settled<=data.issuedMg,'净重、返料、回收和损耗合计不能超过领料');ensure(data.lossMg===0 || data.lossConfirmed,'损耗须经明确确认，不能由差额推定');
      if(old) { ensure(data.issuedMg>=old.issuedMg,'已领料不能减少，请登记返料');ensure(data.returnedMg>=old.returnedMg && data.recoveredMg>=old.recoveredMg,'已入库的返料和回收不能减少'); }
      const issueDelta=data.issuedMg-(old?.issuedMg??0);const returnDelta=data.returnedMg-(old?.returnedMg??0);
      ensure(batchAvailable(next,batch.id)>=issueDelta,'该批次库存不足，不能用本次返料抵扣超额领料');
      if(issueDelta) next.movements.push({id:id('movement'),batchId:batch.id,orderId:o.id,kind:'领料',quantityMg:-issueDelta,reason:'订单累计领料差额',at});
      if(returnDelta) next.movements.push({id:id('movement'),batchId:batch.id,orderId:o.id,kind:'退料',quantityMg:returnDelta,reason:'可用退料归原批次；回收另记',at});
      if(old) Object.assign(old,data,{at});else next.usages.push({id:id('usage'),...data,at});
      const all=next.usages.filter(u=>u.orderId===o.id);const complete=all.every(u=>u.issuedMg===sum([u.netMg,u.returnedMg,u.recoveredMg,u.lossMg]) && (u.lossMg===0 || u.lossConfirmed));
      o.production=o.production==='返工中' ? '返工中' : complete ? '待质检' : '制作中';entityId=o.id;summary=`保存用料；${complete ? o.production==='返工中' ? '数量已平衡，待复检' : '数量已平衡，待质检' : '未结部分明确为在制'}`;break;
    }
    case 'INSPECT_ORDER': {
      const p=command.payload;const o=openOrder(next,p.orderId);ensure(o.status==='已确认','订单须先确认');const pass=boolean(p.pass,'质检结果');const reason=required(p.reason,'质检依据');
      ensure(o.production!=='已合格','订单已合格，无需重复质检');
      if(o.kind==='定制') {ensure(['待质检','返工中'].includes(o.production),'用料平衡并完成制作后才能质检');const usages=next.usages.filter(u=>u.orderId===o.id);ensure(usages.length>0,'定制订单须有用料记录');ensure(usages.every(u=>u.issuedMg===sum([u.netMg,u.returnedMg,u.recoveredMg,u.lossMg]) && (!u.lossMg || u.lossConfirmed)),'用料尚有在制数量或未确认损耗'); }
      const lastNote=o.qualityNotes.at(-1) ?? '';
      if(pass && lastNote.includes('未通过')) {const failure=next.audits.filter(a=>a.entityId===o.id && a.action==='INSPECT_ORDER' && a.summary.includes('未通过')).at(-1);const hasExpense=failure ? next.audits.slice(next.audits.indexOf(failure)+1).some(a=>a.entityId===o.id && a.action==='ADD_EXPENSE' && a.summary.startsWith('追加返工')) : next.expenses.some(e=>e.orderId===o.id && e.type==='返工');ensure(hasExpense,'返工须先追加本次费用，再进行复检');}
      o.production=pass ? '已合格' : '返工中';o.qualityNotes.push(`${at.slice(0,10)} ${pass ? '质检/复检合格' : '质检未通过，返工'}：${reason}`);entityId=o.id;summary=pass ? '质检合格，可交付' : '质检未通过，已进入返工';break;
    }
    case 'ADD_EXPENSE': {
      const p=command.payload;const o=openOrder(next,p.orderId);ensure(o.status==='已确认','确认订单后才能追加费用');const type=choice(p.type,['加工','返工','其他'],'费用类型');const amount=integer(p.amountCents,'费用');ensure(amount>0,'费用须大于0');if(type==='返工') ensure(o.production==='返工中','只有返工订单可登记返工费');next.expenses.push({id:id('expense'),orderId:o.id,type,amountCents:amount,reason:required(p.reason,'费用说明'),at});entityId=o.id;summary=`追加${type}费用 ${formatMoney(amount)}`;break;
    }
    case 'SAVE_BATCH': {
      const p=command.payload;const quantity=integer(p.quantityMg,'入库重量');ensure(quantity>0,'入库重量须大于0');const cost=integer(p.unitCostCents,'批次单位成本');materialCost(quantity,cost);const batchId=id('batch');next.batches.push({id:batchId,material:choice(p.material,['黄金','白银'],'材料'),purity:required(p.purity,'成色'),source:required(p.source,'采购来源'),unitCostCents:cost,location:required(p.location,'库位'),receivedAt:at});next.movements.push({id:id('movement'),batchId,kind:'入库',quantityMg:quantity,reason:'新批次采购入库',at});entityId=batchId;summary='批次与入库账已原子保存';break;
    }
    case 'ADJUST_STOCK': {
      const p=command.payload;const batch=find(next.batches,p.batchId,'批次');const delta=integer(p.quantityMg,'盘点差额',true);ensure(delta!==0,'盘点差额不能为0');ensure(sum([batchAvailable(next,batch.id),delta],'盘点后库存')>=0,'盘点后库存不能为负');next.movements.push({id:id('movement'),batchId:batch.id,kind:'盘点调整',quantityMg:delta,reason:required(p.reason,'盘点原因'),at});entityId=batch.id;summary=`盘点调整 ${formatWeight(delta)}`;break;
    }
    case 'ADD_RECEIPT': {
      const p=command.payload;const o=find(next.orders,p.orderId,'订单');const kind=choice(p.kind,['收款','退款'],'资金类型');ensure(kind==='退款' || o.status!=='已取消','取消订单不能新增收款');const amount=integer(p.amountCents,'金额');ensure(amount>0,'金额须大于0');next.receipts.push({id:id('receipt'),orderId:o.id,kind,amountCents:amount,method:required(p.method,'支付方式'),verified:false,note:required(p.note,'资金说明'),at});receiptLimits(next,o.id);entityId=o.id;summary=`登记${kind}，待财务核验`;break;
    }
    case 'VERIFY_RECEIPT': {
      ensure(['财务','经营负责人','管理员'].includes(next.settings.role),'仅财务、经营负责人或管理员可核验资金');const r=find(next.receipts,command.payload.receiptId,'资金记录');ensure(!r.verified,'该资金记录已核验');r.verified=true;receiptLimits(next,r.orderId);entityId=r.orderId;summary=`${r.kind}已核验，销售与财务共享同笔记录`;break;
    }
    case 'SAVE_CAMPAIGN': {
      const p=command.payload;const old=p.id ? find(next.campaigns,p.id,'活动') : undefined;const data={name:required(p.name,'活动名称'),channel:required(p.channel,'渠道'),budgetCents:integer(p.budgetCents,'预算'),status:choice(p.status,['草稿','进行中','已结束'],'活动状态')};if(old) Object.assign(old,data);else next.campaigns.push({id:id('campaign'),...data,customerIds:[]});entityId=old?.id ?? next.campaigns.at(-1)!.id;summary=`保存营销活动 ${data.name}`;break;
    }
    case 'ADD_CAMPAIGN_LEAD': {
      const p=command.payload;const campaign=find(next.campaigns,p.campaignId,'活动');ensure(campaign.status!=='已结束','活动已结束');const name=required(p.name,'客户姓名');const phone=required(p.phone,'电话');const advisor=required(p.advisor,'跟进顾问');let customer=next.customers.find(c=>c.phone===phone);if(!customer) {customer={id:id('customer'),name,phone,advisor,source:campaign.name,stage:'新线索',member:false,notes:[]};next.customers.push(customer);}ensure(!campaign.customerIds.includes(customer.id),'该客户已归入本活动');campaign.customerIds.push(customer.id);entityId=customer.id;summary='活动线索已关联统一客户记录';break;
    }
    case 'SAVE_CASE': {const p=command.payload;const o=find(next.orders,p.orderId,'订单');const caseId=id('case');next.cases.push({id:caseId,orderId:o.id,type:choice(p.type,['变更','退货','维修','取消'],'售后类型'),reason:required(p.reason,'售后原因'),status:'待处理',result:'',at});entityId=caseId;summary='创建售后记录，订单及资金状态独立';break;}
    case 'UPDATE_CASE': {const p=command.payload;const record=find(next.cases,p.caseId,'售后记录');const status=choice(p.status,['待处理','处理中','已关闭'],'售后状态');const result=required(p.result,'处理结果');record.status=status;record.result=result;entityId=record.id;summary=`售后更新为${status}`;break;}
    case 'COMPLETE_TODO': {const todo=find(next.todos,command.payload.todoId,'待办');ensure(!todo.done,'待办已完成');todo.done=true;entityId=todo.id;summary=`完成待办：${todo.title}`;break;}
    case 'UPDATE_SETTINGS': {
      const p=command.payload;ensure(p && Object.keys(p).length,'没有设置变更');const keys=Object.keys(p);ensure(keys.every(k=>['storeName','role','marketRunning','goldCents','silverCents','tick','integrationEnabled'].includes(k)),'设置字段无效');const s:Settings={...next.settings};if(p.storeName!==undefined) s.storeName=required(p.storeName,'门店名称');if(p.role!==undefined) s.role=choice(p.role,roles,'演示角色');if(p.marketRunning!==undefined) s.marketRunning=boolean(p.marketRunning,'行情运行');if(p.integrationEnabled!==undefined) s.integrationEnabled=boolean(p.integrationEnabled,'模拟连接');if(p.goldCents!==undefined) s.goldCents=integer(p.goldCents,'黄金价格');if(p.silverCents!==undefined) s.silverCents=integer(p.silverCents,'白银价格');if(p.tick!==undefined) s.tick=integer(p.tick,'行情序号');next.settings=s;summary='更新演示设置';break;
    }
    case 'MARKET_TICK': {
      const tick=integer(next.settings.tick+1,'行情序号');const offsets=[0,90,180,120,40,-80,-160,-100,-30,70,130,40];next.settings.tick=tick;next.settings.goldCents=83500+offsets[tick%offsets.length];next.settings.silverCents=1010+Math.round(offsets[(tick+3)%offsets.length]/30);next.marketHistory.push({at,goldCents:next.settings.goldCents,silverCents:next.settings.silverCents});next.marketHistory=next.marketHistory.slice(-60);return next;
    }
    case 'SYNC_ORDERS': {
      const fail=command.payload.fail===undefined ? false : boolean(command.payload.fail,'模拟失败');const enabled=next.settings.integrationEnabled;
      if(!enabled || fail) {next.apiLogs.push({id:id('api'),at,path:'/mock/orders',method:'GET',status:enabled ? 503 : 0,message:enabled ? '模拟503：导入失败，保留本地记录，可重试' : '模拟连接已关闭，未导入'});summary='模拟同步失败，失败日志已保存';break;}
      let count=0;for(const external of next.externalOrders) {required(external.externalId,'外部订单号');if(next.orders.some(o=>o.externalId===external.externalId)) continue;let customer=next.customers.find(c=>c.name===external.customerName);if(!customer) {customer={id:id('customer'),name:required(external.customerName,'外部客户姓名'),phone:'未提供（模拟订单）',source:'模拟小程序',advisor:'待分配顾问',stage:'新线索',member:false,notes:[]};next.customers.push(customer);}newOrder({customerId:customer.id,productId:external.productId,channel:'小程序（模拟）',kind:'定制',quoteCents:external.quoteCents,dueDate:external.dueDate},external.externalId);count++;}next.apiLogs.push({id:id('api'),at,path:'/mock/orders',method:'GET',status:200,message:`导入${count}笔；已关联externalId自动跳过`});summary=`模拟同步完成，新增${count}笔`;break;
    }
    case 'PUSH_PROGRESS': {
      const o=find(next.orders,command.payload.orderId,'订单');ensure(o.externalId,'订单没有外部订单号，无法模拟回传');const enabled=next.settings.integrationEnabled;next.apiLogs.push({id:id('api'),at,path:`/mock/orders/${o.externalId}/progress`,method:'POST',status:enabled ? 200 : 0,message:enabled ? `模拟回传 ${o.production} / ${o.delivery}；未调用真实API` : '模拟连接已关闭，回传失败'});entityId=o.id;summary=enabled ? '进度模拟回传日志已保存' : '模拟回传失败，日志已保存';break;
    }
    default: throw new Error('未知操作');
  }
  audit();
  validateState(next);
  return next;
}

function timestamp(value: unknown, name: string): void { const text=required(value,name);ensure(Number.isFinite(new Date(text).getTime()),`${name}无效`); }

// 本地存档同样是信任边界，损坏记录不能作为新的权威数据。
export function validateState(value: unknown): asserts value is CRMState {
  ensure(value && typeof value==='object','存档不是有效对象');const s=value as CRMState;ensure(s.version===1,'存档版本不受支持');
  const collections=['customers','products','orders','batches','movements','usages','expenses','receipts','campaigns','cases','todos','audits','apiLogs','externalOrders','marketHistory'] as const;
  for(const key of collections) ensure(Array.isArray(s[key]),`存档缺少${key}`);
  for(const key of collections.filter(k=>k!=='externalOrders' && k!=='marketHistory')) {const ids=new Set<string>();for(const row of s[key] as {id:string}[]) {ensure(row && typeof row==='object',`${key}记录无效`);const recordId=required(row.id,'记录ID');ensure(!ids.has(recordId),`${key}存在重复ID`);ids.add(recordId);}}
  for(const c of s.customers) {required(c.name,'客户姓名');required(c.phone,'电话');required(c.source,'来源');required(c.advisor,'顾问');choice(c.stage,['新线索','跟进中','已成交'],'客户阶段');boolean(c.member,'会员');ensure(Array.isArray(c.notes),'跟进记录无效');for(const f of c.notes) {required(f.id,'跟进ID');required(f.text,'跟进内容');timestamp(f.at,'跟进时间');day(f.nextDate,'跟进日期');}}
  for(const p of s.products) {required(p.name,'商品名称');required(p.series,'系列');required(p.purity,'成色');choice(p.status,['草稿','已确认'],'商品状态');for(const key of ['goldMg','accessoryCents','processingCents','salesFeeCents'] as const) integer(p[key],'商品重量/费用');ensure(Array.isArray(p.versions) && p.versions.length,'设计版本缺失');const versions=new Set<string>();for(const v of p.versions) {required(v.version,'设计版本');ensure(!versions.has(v.version),'设计版本重复');versions.add(v.version);timestamp(v.at,'设计时间');for(const key of ['goldMg','accessoryCents','processingCents','salesFeeCents'] as const) integer(v[key],'设计重量/费用');sum([v.accessoryCents,v.processingCents,v.salesFeeCents],'设计费用合计');}const v=p.versions.find(v=>v.version===p.designVersion);ensure(v && v.goldMg===p.goldMg && v.accessoryCents===p.accessoryCents && v.processingCents===p.processingCents && v.salesFeeCents===p.salesFeeCents,'当前设计与版本记录不一致');}
  for(const o of s.orders) {required(o.number,'订单号');find(s.customers,o.customerId,'订单客户');const p=find(s.products,o.productId,'订单商品');required(o.channel,'订单渠道');choice(o.kind,['现货','定制'],'订单类型');integer(o.quoteCents,'报价');ensure(o.quoteCents>0,'报价无效');integer(o.goldQuoteCents,'报价金价');integer(o.quoteVersion,'报价版本');ensure(p.versions.some(v=>v.version===o.designVersion),'订单设计版本缺失');timestamp(o.createdAt,'创建时间');day(o.dueDate,'交期');choice(o.production,['待排产','制作中','待质检','返工中','已合格'],'生产状态');choice(o.delivery,['未交付','已交付'],'交付状态');choice(o.status,['待确认','已确认','已取消'],'确认状态');ensure(Array.isArray(o.qualityNotes) && o.qualityNotes.every(n=>typeof n==='string'),'质检记录无效');if(o.externalId!==undefined) required(o.externalId,'外部订单号');ensure(Array.isArray(o.quoteHistory) && o.quoteHistory.length,'报价历史缺失');let prior=0;for(const q of o.quoteHistory) {integer(q.version,'报价版本');ensure(q.version>prior,'报价历史版本顺序无效');prior=q.version;integer(q.amountCents,'历史报价');ensure(q.amountCents>0 && p.versions.some(v=>v.version===q.designVersion),'历史报价无效');timestamp(q.at,'报价时间');}const q=o.quoteHistory.at(-1)!;ensure(q.version===o.quoteVersion && q.amountCents===o.quoteCents && q.designVersion===o.designVersion,'当前报价与历史不一致');ensure(o.delivery!=='已交付' || (o.status==='已确认' && o.production==='已合格'),'已交付订单状态不完整');}
  const externalIds=s.orders.flatMap(o=>o.externalId ? [o.externalId] : []);ensure(new Set(externalIds).size===externalIds.length,'外部订单被重复导入');
  for(const b of s.batches) {choice(b.material,['黄金','白银'],'材料');required(b.purity,'成色');required(b.source,'批次来源');required(b.location,'库位');integer(b.unitCostCents,'批次成本');timestamp(b.receivedAt,'入库时间');}
  for(const m of s.movements) {find(s.batches,m.batchId,'库存批次');if(m.orderId!==undefined) find(s.orders,m.orderId,'库存订单');choice(m.kind,['入库','领料','退料','盘点调整'],'出入库类型');integer(m.quantityMg,'出入库数量',true);ensure(m.quantityMg!==0,'出入库数量不能为0');ensure(m.kind==='盘点调整' || (m.kind==='领料' ? m.quantityMg<0 : m.quantityMg>0),'出入库数量方向无效');required(m.reason,'库存原因');timestamp(m.at,'出入库时间');}
  const usageKeys=new Set<string>();for(const u of s.usages) {find(s.orders,u.orderId,'用料订单');find(s.batches,u.batchId,'用料批次');const key=`${u.orderId}/${u.batchId}`;ensure(!usageKeys.has(key),'用料记录重复');usageKeys.add(key);for(const field of ['issuedMg','netMg','returnedMg','recoveredMg','lossMg'] as const) integer(u[field],'用料重量');ensure(u.issuedMg>0 && sum([u.netMg,u.returnedMg,u.recoveredMg,u.lossMg])<=u.issuedMg,'用料数量不平衡');boolean(u.lossConfirmed,'损耗确认');ensure(!u.lossMg || u.lossConfirmed,'损耗未经确认');timestamp(u.at,'用料时间');const movements=s.movements.filter(m=>m.orderId===u.orderId && m.batchId===u.batchId);ensure(-sum(movements.filter(m=>m.kind==='领料').map(m=>m.quantityMg))===u.issuedMg && sum(movements.filter(m=>m.kind==='退料').map(m=>m.quantityMg))===u.returnedMg,'用料与库存账不一致');materialCost(u.netMg+(u.lossConfirmed ? u.lossMg : 0),find(s.batches,u.batchId,'批次').unitCostCents);}
  for(const m of s.movements.filter(m=>m.orderId && ['领料','退料'].includes(m.kind))) ensure(usageKeys.has(`${m.orderId}/${m.batchId}`),'出入库缺少用料依据');
  for(const b of s.batches) ensure(batchAvailable(s,b.id)>=0,'批次库存为负');
  for(const o of s.orders.filter(o=>o.kind==='定制' && ['待质检','已合格'].includes(o.production))) {const usages=s.usages.filter(u=>u.orderId===o.id);ensure(usages.length && usages.every(u=>u.issuedMg===sum([u.netMg,u.returnedMg,u.recoveredMg,u.lossMg])),'定制质检订单还有在制用料');}
  for(const e of s.expenses) {find(s.orders,e.orderId,'费用订单');choice(e.type,['加工','返工','其他'],'费用类型');ensure(integer(e.amountCents,'费用')>0,'费用无效');required(e.reason,'费用原因');timestamp(e.at,'费用时间');}
  for(const r of s.receipts) {find(s.orders,r.orderId,'资金订单');choice(r.kind,['收款','退款'],'资金类型');ensure(integer(r.amountCents,'资金金额')>0,'资金金额无效');required(r.method,'支付方式');boolean(r.verified,'核验状态');required(r.note,'资金说明');timestamp(r.at,'资金时间');}
  for(const o of s.orders) {receiptLimits(s,o.id);orderCost(s,o.id);}
  for(const c of s.campaigns) {required(c.name,'活动名称');required(c.channel,'活动渠道');integer(c.budgetCents,'活动预算');choice(c.status,['草稿','进行中','已结束'],'活动状态');ensure(Array.isArray(c.customerIds) && new Set(c.customerIds).size===c.customerIds.length,'活动客户无效');for(const cid of c.customerIds) find(s.customers,cid,'活动客户');}
  for(const c of s.cases) {find(s.orders,c.orderId,'售后订单');choice(c.type,['变更','退货','维修','取消'],'售后类型');choice(c.status,['待处理','处理中','已关闭'],'售后状态');required(c.reason,'售后原因');ensure(typeof c.result==='string' && (c.status!=='已关闭' || c.result.trim()),'售后结果无效');timestamp(c.at,'售后时间');}
  for(const t of s.todos) {required(t.title,'待办名称');choice(t.owner,roles,'待办岗位');choice(t.page,pages,'待办页面');boolean(t.done,'待办状态');day(t.dueDate,'待办日期');if(t.entityId!==undefined) ensure([s.orders,s.customers,s.products,s.batches,s.receipts,s.campaigns,s.cases].some(items=>items.some(item=>item.id===t.entityId)),'待办关联记录不存在');}
  for(const a of s.audits) {timestamp(a.at,'操作时间');choice(a.actor,roles,'操作角色');required(a.action,'操作名称');required(a.summary,'操作说明');}
  for(const a of s.apiLogs) {timestamp(a.at,'API时间');required(a.path,'API路径');required(a.method,'API方法');integer(a.status,'API状态');required(a.message,'API说明');}
  const externalSet=new Set<string>();for(const e of s.externalOrders) {required(e.externalId,'外部订单号');ensure(!externalSet.has(e.externalId),'外部订单列表重复');externalSet.add(e.externalId);required(e.customerName,'外部客户');find(s.products,e.productId,'外部商品');ensure(integer(e.quoteCents,'外部报价')>0,'外部报价无效');day(e.dueDate,'外部交期');}
  ensure(s.marketHistory.length>=1 && s.marketHistory.length<=60,'行情记录数量无效');for(const p of s.marketHistory) {timestamp(p.at,'行情时间');integer(p.goldCents,'行情金价');integer(p.silverCents,'行情银价');}
  ensure(s.settings && typeof s.settings==='object','设置缺失');required(s.settings.storeName,'门店名称');choice(s.settings.role,roles,'演示角色');boolean(s.settings.marketRunning,'行情运行');boolean(s.settings.integrationEnabled,'模拟连接');integer(s.settings.goldCents,'黄金价格');integer(s.settings.silverCents,'白银价格');integer(s.settings.tick,'行情序号');
}

type LocalStoragePort = Pick<Storage,'getItem'|'setItem'>;
export function loadLocalState(storage: LocalStoragePort): {state:CRMState;storageError:string|null;blocked:boolean} {
  try {const raw=storage.getItem(STORAGE_KEY);if(raw===null) return {state:createSeed(),storageError:null,blocked:false};const saved:unknown=JSON.parse(raw);validateState(saved);return {state:saved,storageError:null,blocked:false};}
  catch(error) {return {state:createSeed(),storageError:`本地存档无法读取：${error instanceof Error ? error.message : String(error)}。当前显示初始演示，原记录保留；可在浏览器本地存储备份原值，或重置演示数据恢复。`,blocked:true};}
}
export function saveLocalState(storage: LocalStoragePort, state: CRMState): void {
  try {storage.setItem(STORAGE_KEY,JSON.stringify(state));}
  catch(error) {const failure=new Error(`本地保存失败：${error instanceof Error ? error.message : String(error)}。本次操作未生效，原记录和输入保留。`);failure.name='StorageSaveError';throw failure;}
}
export function commitLocalState(storage: LocalStoragePort, state: CRMState, command: Command, blocked=false): CRMState {
  ensure(!blocked || command.type==='RESET','原存档损坏或无法读取，请先重置演示数据；原存档尚未覆盖');const candidate=applyCommand(state,command);saveLocalState(storage,candidate);return candidate;
}
