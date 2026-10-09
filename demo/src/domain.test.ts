import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCommand, batchAvailable, businessDay, commitLocalState, createSeed, formatMoney, formatWeight, loadLocalState, orderBalance, orderCost, STORAGE_KEY, validateState } from './domain.ts';
import type { Command, CRMState } from './types.ts';

const act=(state:CRMState,command:Command)=>applyCommand(state,command);
function fakeStorage(raw:string|null=null) { return {raw,fail:false,getItem(key:string) {assert.equal(key,STORAGE_KEY);return this.raw;},setItem(key:string,value:string) {assert.equal(key,STORAGE_KEY);if(this.fail) throw new Error('QuotaExceededError');this.raw=value;}}; }
const receipt=(orderId:string,amountCents:number,kind:'收款'|'退款'='收款'):Command=>({type:'ADD_RECEIPT',payload:{orderId,amountCents,kind,method:'演示银行卡',note:'演示测试凭据'}});

test('虚构种子跨模块完整，金额/重量格式可用',()=>{
  assert.equal(businessDay('2026-10-09T20:00:00.000Z'),'2026-10-10');assert.equal(businessDay('2026-10-09T15:59:59.000Z'),'2026-10-09');
  const state=createSeed();validateState(state);assert.ok(state.marketHistory.length>=12);assert.ok(state.customers.every(c=>c.name.includes('虚构')));assert.equal(batchAvailable(state,'b1'),463700);assert.equal(orderBalance(state,'o1').receivedCents,300000);assert.equal(formatMoney(12345),'¥123.45');assert.equal(formatWeight(12345),'12.345 g');
});

test('报价和设计留版本，行情与商品新版本不改历史成本',()=>{
  const initial=createSeed();const before=structuredClone(initial);const cost=orderCost(initial,'o3');
  let state=act(initial,{type:'REQUOTE_ORDER',payload:{orderId:'o1',quoteCents:950000,designVersion:'R1.2'}});assert.equal(state.orders[0].quoteHistory.length,3);assert.equal(state.orders[0].quoteHistory[1].amountCents,938000);assert.deepEqual(initial,before);
  const p=state.products[0];state=act(state,{type:'SAVE_PRODUCT',payload:{...p,id:p.id,designVersion:'R1.3',accessoryCents:48000}});assert.equal(state.products[0].versions.length,3);assert.equal(orderCost(state,'o3'),cost);
  assert.throws(()=>act(state,{type:'SAVE_PRODUCT',payload:{...state.products[0],accessoryCents:49000}}),/新设计版本/);
  state=act(state,{type:'MARKET_TICK'});assert.equal(orderCost(state,'o3'),cost);assert.equal(state.orders[2].quoteCents,938000);
});

test('累计用料原子入账、回收不增加可用库存，不能超领或自动推定损耗',()=>{
  const initial=createSeed();const before=JSON.stringify(initial);const available=batchAvailable(initial,'b1');
  const command:Command={type:'SAVE_USAGE',payload:{orderId:'o1',batchId:'b1',issuedMg:11200,netMg:9000,returnedMg:1400,recoveredMg:300,lossMg:500,lossConfirmed:true}};
  const state=act(initial,command);assert.equal(state.usages.length,initial.usages.length);assert.equal(batchAvailable(state,'b1'),available+400);assert.equal(state.orders[0].production,'待质检');assert.equal(state.movements.at(-1)?.quantityMg,400);validateState(state);
  assert.throws(()=>act(initial,{...command,payload:{...command.payload,lossConfirmed:false}}),/损耗须经明确确认/);
  assert.throws(()=>act(initial,{...command,payload:{...command.payload,issuedMg:600000}}),/库存不足/);
  assert.throws(()=>act(initial,{type:'ADJUST_STOCK',payload:{batchId:'b1',quantityMg:-available-1,reason:'演示盘亏'}}),/不能为负/);
  assert.equal(JSON.stringify(initial),before);
  const partial=act(initial,{type:'SAVE_USAGE',payload:{orderId:'o1',batchId:'b1',issuedMg:11200,netMg:5000,returnedMg:1000,recoveredMg:200,lossMg:0,lossConfirmed:false}});assert.equal(partial.orders[0].production,'制作中');assert.throws(()=>act(partial,{type:'INSPECT_ORDER',payload:{orderId:'o1',pass:true,reason:'尝试跳过在制'}}),/完成制作/);
});

test('返工需本次追加费用并复检，交付不绑收款，取消保留费用',()=>{
  let state=createSeed();state=act(state,{type:'CREATE_ORDER',payload:{customerId:'c1',productId:'p1',kind:'定制',channel:'门店',quoteCents:938000,dueDate:'2026-10-20'}});const orderId=state.orders.at(-1)!.id;
  assert.throws(()=>act(state,{type:'START_PRODUCTION',payload:{orderId}}),/先确认/);state=act(state,{type:'CONFIRM_ORDER',payload:{orderId}});state=act(state,{type:'START_PRODUCTION',payload:{orderId}});
  state=act(state,{type:'SAVE_USAGE',payload:{orderId,batchId:'b1',issuedMg:10000,netMg:9000,returnedMg:500,recoveredMg:300,lossMg:200,lossConfirmed:true}});state=act(state,{type:'INSPECT_ORDER',payload:{orderId,pass:false,reason:'外观需修整'}});
  assert.throws(()=>act(state,{type:'DELIVER_ORDER',payload:{orderId}}),/合格/);assert.throws(()=>act(state,{type:'INSPECT_ORDER',payload:{orderId,pass:true,reason:'复检'}}),/本次费用/);
  state=act(state,{type:'SAVE_USAGE',payload:{orderId,batchId:'b1',issuedMg:10000,netMg:8900,returnedMg:600,recoveredMg:300,lossMg:200,lossConfirmed:true}});assert.equal(state.orders.at(-1)!.production,'返工中');
  state=act(state,{type:'ADD_EXPENSE',payload:{orderId,type:'返工',amountCents:12000,reason:'修整外观'}});state=act(state,{type:'INSPECT_ORDER',payload:{orderId,pass:false,reason:'仍有划痕'}});
  assert.throws(()=>act(state,{type:'INSPECT_ORDER',payload:{orderId,pass:true,reason:'再次复检'}}),/本次费用/);
  state=act(state,{type:'ADD_EXPENSE',payload:{orderId,type:'返工',amountCents:3000,reason:'再次抛光'}});state=act(state,{type:'INSPECT_ORDER',payload:{orderId,pass:true,reason:'外观合格'}});state=act(state,{type:'DELIVER_ORDER',payload:{orderId}});assert.equal(orderBalance(state,orderId).receivedCents,0);assert.equal(state.orders.at(-1)!.delivery,'已交付');
  const expenses=state.expenses.filter(e=>e.orderId==='o2');state=act(state,{type:'CANCEL_ORDER',payload:{orderId:'o2'}});assert.deepEqual(state.expenses.filter(e=>e.orderId==='o2'),expenses);
});

test('现货必须先确认和检查后交付',()=>{
  let state=createSeed();assert.throws(()=>act(state,{type:'INSPECT_ORDER',payload:{orderId:'o5',pass:true,reason:'现货检查'}}),/先确认/);assert.throws(()=>act(state,{type:'DELIVER_ORDER',payload:{orderId:'o5'}}),/先确认/);
  state=act(state,{type:'CONFIRM_ORDER',payload:{orderId:'o5'}});assert.throws(()=>act(state,{type:'DELIVER_ORDER',payload:{orderId:'o5'}}),/合格/);state=act(state,{type:'INSPECT_ORDER',payload:{orderId:'o5',pass:true,reason:'外观与配件检查合格'}});state=act(state,{type:'DELIVER_ORDER',payload:{orderId:'o5'}});assert.equal(state.orders.find(o=>o.id==='o5')!.delivery,'已交付');
});

test('财务与订单共享资金，待核验预留防超收/超退，核验限制演示角色',()=>{
  let state=createSeed();state=act(state,receipt('o3',38000));const receiptId=state.receipts.at(-1)!.id;assert.throws(()=>act(state,receipt('o3',1)),/不能超过订单报价/);assert.equal(orderBalance(state,'o3').dueCents,38000);assert.equal(orderBalance(state,'o3').pendingCents,38000);
  assert.throws(()=>act(state,receipt('o3',900001,'退款')),/不能超过已核验收款/);state=act(state,receipt('o3',10000,'退款'));assert.equal(orderBalance(state,'o3').pendingCents,28000);
  state=act(state,{type:'UPDATE_SETTINGS',payload:{role:'门店顾问'}});assert.throws(()=>act(state,{type:'VERIFY_RECEIPT',payload:{receiptId}}),/仅财务/);state=act(state,{type:'UPDATE_SETTINGS',payload:{role:'财务'}});state=act(state,{type:'VERIFY_RECEIPT',payload:{receiptId}});assert.equal(orderBalance(state,'o3').receivedCents,938000);assert.equal(orderBalance(state,'o3').refundedCents,0);assert.equal(orderBalance(state,'o3').dueCents,0);assert.equal(state.orders[2].delivery,'未交付');assert.throws(()=>act(state,{type:'VERIFY_RECEIPT',payload:{receiptId}}),/已核验/);
  const refundId=state.receipts.at(-1)!.id;state=act(state,{type:'VERIFY_RECEIPT',payload:{receiptId:refundId}});assert.equal(orderBalance(state,'o3').dueCents,10000);assert.equal(state.receipts.length,createSeed().receipts.length+2);assert.throws(()=>act(state,{type:'REQUOTE_ORDER',payload:{orderId:'o3',quoteCents:900000,designVersion:'R1.2'}}),/不能超过订单报价/);
});

test('模拟导入失败只留日志，重试按externalId防重；回传不改业务状态',()=>{
  const initial=createSeed();let state=act(initial,{type:'SYNC_ORDERS',payload:{fail:true}});assert.equal(state.apiLogs.at(-1)!.status,503);assert.deepEqual(state.orders,initial.orders);
  state=act(state,{type:'SYNC_ORDERS',payload:{}});assert.equal(state.orders.length,initial.orders.length+1);const customers=state.customers.length;state=act(state,{type:'SYNC_ORDERS',payload:{}});assert.equal(state.orders.length,initial.orders.length+1);assert.equal(state.customers.length,customers);
  const orders=structuredClone(state.orders);state=act(state,{type:'PUSH_PROGRESS',payload:{orderId:'o2'}});assert.deepEqual(state.orders,orders);assert.equal(state.apiLogs.at(-1)!.status,200);
  state=act(state,{type:'UPDATE_SETTINGS',payload:{integrationEnabled:false}});state=act(state,{type:'SYNC_ORDERS',payload:{}});assert.equal(state.apiLogs.at(-1)!.status,0);state=act(state,{type:'PUSH_PROGRESS',payload:{orderId:'o2'}});assert.equal(state.apiLogs.at(-1)!.status,0);
});

test('暂停时手动行情更新仍有效，确定序列有界并最多60点',()=>{
  let state=act(createSeed(),{type:'UPDATE_SETTINGS',payload:{marketRunning:false}});const tick=state.settings.tick;state=act(state,{type:'MARKET_TICK'});assert.equal(state.settings.tick,tick+1);for(let i=0;i<120;i++) state=act(state,{type:'MARKET_TICK'});assert.equal(state.marketHistory.length,60);assert.ok(state.marketHistory.every(p=>p.goldCents>=83340 && p.goldCents<=83680));
});

test('客户、活动、售后、待办与采购命令留下实际结果',()=>{
  let state=createSeed();state=act(state,{type:'SAVE_CUSTOMER',payload:{name:'测试顾客（虚构）',phone:'13800001020',source:'活动',advisor:'演示顾问',stage:'新线索',member:false}});const customer=state.customers.at(-1)!;state=act(state,{type:'ADD_FOLLOWUP',payload:{customerId:customer.id,text:'已沟通需求',nextDate:'2026-10-15'}});assert.equal(state.customers.at(-1)!.notes.length,1);
  state=act(state,{type:'SAVE_CAMPAIGN',payload:{name:'演示活动',channel:'社群',budgetCents:120000,status:'进行中'}});const campaignId=state.campaigns.at(-1)!.id;state=act(state,{type:'ADD_CAMPAIGN_LEAD',payload:{campaignId,name:customer.name,phone:customer.phone,advisor:customer.advisor}});assert.equal(state.campaigns.at(-1)!.customerIds[0],customer.id);assert.throws(()=>act(state,{type:'ADD_CAMPAIGN_LEAD',payload:{campaignId,name:customer.name,phone:customer.phone,advisor:customer.advisor}}),/已归入/);
  state=act(state,{type:'SAVE_CASE',payload:{orderId:'o1',type:'变更',reason:'演示刻字变更'}});const caseId=state.cases.at(-1)!.id;state=act(state,{type:'UPDATE_CASE',payload:{caseId,status:'已关闭',result:'已向顾客解释并确认'}});assert.equal(state.cases.at(-1)!.status,'已关闭');state=act(state,{type:'COMPLETE_TODO',payload:{todoId:'t1'}});assert.equal(state.todos[0].done,true);
  state=act(state,{type:'SAVE_BATCH',payload:{material:'黄金',purity:'足金999',source:'演示采购',unitCostCents:72500,location:'原料库A',quantityMg:100000}});const batchId=state.batches.at(-1)!.id;assert.equal(batchAvailable(state,batchId),100000);state=act(state,{type:'ADJUST_STOCK',payload:{batchId,quantityMg:-100,reason:'演示盘亏'}});assert.equal(batchAvailable(state,batchId),99900);validateState(state);
});

test('信任边界拒绝空值、非法枚举、非整数与不存在的引用',()=>{
  const state=createSeed();assert.throws(()=>act(state,receipt('o1',NaN)),/安全整数/);assert.throws(()=>act(state,receipt('o1',1.1)),/安全整数/);assert.throws(()=>act(state,receipt('o1',Number.MAX_SAFE_INTEGER+1)),/安全整数/);assert.throws(()=>act(state,receipt('missing',100)),/不存在/);
  assert.throws(()=>act(state,{type:'ADD_FOLLOWUP',payload:{customerId:'c1',text:' ',nextDate:'2026-10-11'}}),/不能为空/);assert.throws(()=>act(state,{type:'ADD_FOLLOWUP',payload:{customerId:'c1',text:'测试',nextDate:'2026-02-30'}}),/格式无效/);assert.throws(()=>act(state,{type:'UPDATE_SETTINGS',payload:{role:'未知角色' as never}}),/无效/);assert.throws(()=>act(state,{type:'SAVE_BATCH',payload:{material:'黄金',purity:'足金',source:'演示',unitCostCents:Number.MAX_SAFE_INTEGER,location:'A',quantityMg:1000}}),/安全整数/);
});

test('损坏存档不覆盖，禁止普通提交，RESET才能恢复权威数据',()=>{
  for(const raw of ['{broken',JSON.stringify({version:1}),JSON.stringify({...createSeed(),receipts:[{id:'bad',amountCents:NaN}]})]) {
    const storage=fakeStorage(raw);const loaded=loadLocalState(storage);assert.equal(loaded.blocked,true);assert.ok(loaded.storageError);assert.equal(storage.raw,raw);assert.throws(()=>commitLocalState(storage,loaded.state,{type:'COMPLETE_TODO',payload:{todoId:'t1'}},loaded.blocked),/先重置/);assert.equal(storage.raw,raw);
    const recovered=commitLocalState(storage,loaded.state,{type:'RESET'},loaded.blocked);validateState(recovered);assert.equal(loadLocalState(storage).blocked,false);
  }
});

test('保存失败不发布候选状态；成功后重新读取，同步失败日志也可保存',()=>{
  const initial=createSeed();const raw=JSON.stringify(initial);const storage=fakeStorage(raw);storage.fail=true;const before=JSON.stringify(initial);assert.throws(()=>commitLocalState(storage,initial,{type:'COMPLETE_TODO',payload:{todoId:'t1'}}),/保存失败/);assert.equal(JSON.stringify(initial),before);assert.equal(storage.raw,raw);
  storage.fail=false;const saved=commitLocalState(storage,initial,{type:'COMPLETE_TODO',payload:{todoId:'t1'}});assert.equal(loadLocalState(storage).state.todos[0].done,true);assert.equal(initial.todos[0].done,false);
  const failedSync=commitLocalState(storage,saved,{type:'SYNC_ORDERS',payload:{fail:true}});assert.equal(failedSync.apiLogs.at(-1)!.status,503);assert.equal(loadLocalState(storage).state.apiLogs.at(-1)!.status,503);
});
