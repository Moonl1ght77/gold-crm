export type PageKey = 'home'|'customers'|'orders'|'aftercare'|'products'|'inventory'|'factory'|'marketing'|'finance'|'analytics'|'market'|'system';
export type Role = '经营负责人'|'门店顾问'|'品牌运营'|'产品设计'|'采购仓库'|'工厂质检'|'财务'|'管理员';
export interface Followup { id: string; at: string; text: string; nextDate: string }
export interface Customer { id: string; name: string; phone: string; source: string; advisor: string; stage: '新线索'|'跟进中'|'已成交'; member: boolean; notes: Followup[] }
export interface ProductVersion { version: string; at: string; goldMg: number; accessoryCents: number; processingCents: number; salesFeeCents: number }
export interface Product { id: string; name: string; series: string; designVersion: string; purity: string; goldMg: number; accessoryCents: number; processingCents: number; salesFeeCents: number; status: '草稿'|'已确认'; versions: ProductVersion[] }
export interface QuoteSnapshot { version: number; amountCents: number; designVersion: string; at: string }
export interface Order { id: string; number: string; customerId: string; productId: string; channel: string; kind: '现货'|'定制'; quoteCents: number; goldQuoteCents: number; designVersion: string; quoteVersion: number; quoteHistory: QuoteSnapshot[]; createdAt: string; dueDate: string; production: '待排产'|'制作中'|'待质检'|'返工中'|'已合格'; delivery: '未交付'|'已交付'; status: '待确认'|'已确认'|'已取消'; externalId?: string; qualityNotes: string[] }
export interface Batch { id: string; material: '黄金'|'白银'; purity: string; source: string; unitCostCents: number; location: string; receivedAt: string }
export interface Movement { id: string; batchId: string; orderId?: string; kind: '入库'|'领料'|'退料'|'盘点调整'; quantityMg: number; reason: string; at: string }
export interface Usage { id: string; orderId: string; batchId: string; issuedMg: number; netMg: number; returnedMg: number; recoveredMg: number; lossMg: number; lossConfirmed: boolean; at: string }
export interface Expense { id: string; orderId: string; type: '加工'|'返工'|'其他'; amountCents: number; reason: string; at: string }
export interface Receipt { id: string; orderId: string; kind: '收款'|'退款'; amountCents: number; method: string; verified: boolean; note: string; at: string }
export interface Campaign { id: string; name: string; channel: string; budgetCents: number; status: '草稿'|'进行中'|'已结束'; customerIds: string[] }
export interface ServiceCase { id: string; orderId: string; type: '变更'|'退货'|'维修'|'取消'; reason: string; status: '待处理'|'处理中'|'已关闭'; result: string; at: string }
export interface Todo { id: string; title: string; owner: Role; page: PageKey; entityId?: string; done: boolean; dueDate: string }
export interface Audit { id: string; at: string; actor: Role; action: string; entityId?: string; summary: string }
export interface ApiLog { id: string; at: string; path: string; method: string; status: number; message: string }
export interface ExternalOrder { externalId: string; customerName: string; productId: string; quoteCents: number; dueDate: string }
export interface MarketPoint { at: string; goldCents: number; silverCents: number }
export interface Settings { storeName: string; role: Role; marketRunning: boolean; goldCents: number; silverCents: number; tick: number; integrationEnabled: boolean }
export interface CRMState { version: 1; customers: Customer[]; products: Product[]; orders: Order[]; batches: Batch[]; movements: Movement[]; usages: Usage[]; expenses: Expense[]; receipts: Receipt[]; campaigns: Campaign[]; cases: ServiceCase[]; todos: Todo[]; audits: Audit[]; apiLogs: ApiLog[]; externalOrders: ExternalOrder[]; marketHistory: MarketPoint[]; settings: Settings }
export type Command =
 | { type: 'SAVE_CUSTOMER'; payload: Omit<Customer,'id'|'notes'> & {id?: string} }
 | { type: 'ADD_FOLLOWUP'; payload: {customerId: string; text: string; nextDate: string} }
 | { type: 'SAVE_PRODUCT'; payload: Omit<Product,'id'|'versions'> & {id?: string} }
 | { type: 'CREATE_ORDER'; payload: {customerId: string; productId: string; channel: string; kind: Order['kind']; quoteCents: number; dueDate: string} }
 | { type: 'REQUOTE_ORDER'; payload: {orderId: string; quoteCents: number; designVersion: string} }
 | { type: 'CONFIRM_ORDER'|'START_PRODUCTION'|'DELIVER_ORDER'|'CANCEL_ORDER'; payload: {orderId: string} }
 | { type: 'SAVE_USAGE'; payload: Omit<Usage,'id'|'at'> }
 | { type: 'INSPECT_ORDER'; payload: {orderId: string; pass: boolean; reason: string} }
 | { type: 'ADD_EXPENSE'; payload: Omit<Expense,'id'|'at'> }
 | { type: 'SAVE_BATCH'; payload: Omit<Batch,'id'|'receivedAt'> & {quantityMg: number} }
 | { type: 'ADJUST_STOCK'; payload: {batchId: string; quantityMg: number; reason: string} }
 | { type: 'ADD_RECEIPT'; payload: Omit<Receipt,'id'|'at'|'verified'> }
 | { type: 'VERIFY_RECEIPT'; payload: {receiptId: string} }
 | { type: 'SAVE_CAMPAIGN'; payload: Omit<Campaign,'id'|'customerIds'> & {id?: string} }
 | { type: 'ADD_CAMPAIGN_LEAD'; payload: {campaignId: string; name: string; phone: string; advisor: string} }
 | { type: 'SAVE_CASE'; payload: {orderId: string; type: ServiceCase['type']; reason: string} }
 | { type: 'UPDATE_CASE'; payload: {caseId: string; status: ServiceCase['status']; result: string} }
 | { type: 'COMPLETE_TODO'; payload: {todoId: string} }
 | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
 | { type: 'MARKET_TICK'|'RESET'; payload?: undefined }
 | { type: 'SYNC_ORDERS'; payload: {fail?: boolean} }
 | { type: 'PUSH_PROGRESS'; payload: {orderId: string} };
export interface PageProps { navigate: (page: PageKey, entityId?: string) => void; focusId?: string }
