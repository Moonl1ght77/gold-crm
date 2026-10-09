import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Checkbox, Descriptions, Drawer, Empty, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag } from 'antd';
import type { FormInstance } from 'antd';
import { useCRM } from './store';
import { batchAvailable, formatMoney, formatWeight, orderBalance, orderCost } from './domain';
import { PageHeader, Panel, StatusTag } from './ui';
import type { Command, CRMState, Customer, Order, PageProps, Product, ServiceCase } from './types';

const required = [{ required: true, message: '请填写此项' }];
const options = (values: readonly string[]) => values.map(value => ({ value, label: value }));
const dateText = (value: string) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
const empty = (filtered: boolean, noun: string) => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filtered ? '没有符合筛选条件的记录' : `暂无${noun}`} />;
function fundsStatus(state: CRMState, orderId: string) {
  if (state.receipts.some(r => r.orderId === orderId && !r.verified)) return '待核验';
  const balance = orderBalance(state, orderId);
  if (balance.dueCents === 0) return '已收齐';
  if (balance.refundedCents > 0) return '已有退款';
  return balance.receivedCents > 0 ? '部分收款' : '未收款';
}

function useAction() {
  const { run, busy } = useCRM();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  async function act(command: Command, done?: () => void) {
    if (lock.current || busy) return false;
    lock.current = true;
    setPending(true);
    try { await run(command); done?.(); return true; }
    catch { return false; }
    finally { lock.current = false; setPending(false); }
  }
  return { act, busy: busy || pending };
}

function FormDrawer({ title, open, form, busy, close, finish, children, saveLabel = '保存' }: {
  title: string; open: boolean; form: FormInstance; busy: boolean; close: () => void;
  finish: (values: any) => void | Promise<void>; children: ReactNode; saveLabel?: string;
}) {
  return <Drawer title={title} open={open} onClose={close} size={560} zIndex={1200} forceRender closable={!busy} maskClosable={!busy}
    footer={<Space><Button onClick={close} disabled={busy}>取消</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>{saveLabel}</Button></Space>}>
    <Form form={form} layout="vertical" onFinish={finish}>{children}</Form>
  </Drawer>;
}

function MoneyInput({ name, label, min = 0 }: { name: string; label: string; min?: number }) {
  return <Form.Item name={name} label={label} rules={required}><InputNumber min={min} precision={2} step={1} suffix="元" style={{ width: '100%' }} /></Form.Item>;
}

function WeightInput({ name, label }: { name: string; label: string }) {
  return <Form.Item name={name} label={label} rules={required}><InputNumber min={0} precision={3} step={0.001} suffix="g" style={{ width: '100%' }} /></Form.Item>;
}

export function CustomerPage({ navigate, focusId }: PageProps) {
  const { state } = useCRM();
  const { act, busy } = useAction();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('全部');
  const [member, setMember] = useState('全部');
  const [detailId, setDetailId] = useState<string>();
  const [editId, setEditId] = useState<string>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [followOpen, setFollowOpen] = useState(false);
  const [followCustomerId, setFollowCustomerId] = useState<string>();
  const [form] = Form.useForm();
  const [followForm] = Form.useForm();
  useEffect(() => { if (focusId) setDetailId(focusId); }, [focusId]);
  const customer = state.customers.find(c => c.id === detailId);
  const customerOrders = state.orders.filter(o => o.customerId === detailId);
  const rows = state.customers.filter(c => (!query || `${c.name} ${c.phone} ${c.advisor}`.includes(query.trim())) && (stage === '全部' || c.stage === stage) && (member === '全部' || c.member === (member === '会员')));
  function edit(value?: Customer) {
    setEditId(value?.id); form.resetFields();
    form.setFieldsValue(value ?? { name: '', phone: '', source: '门店', advisor: '门店顾问', stage: '新线索', member: false });
    setEditorOpen(true);
  }
  return <div className="page-stack">
    <PageHeader title="客户与跟进" description="客户、会员和消费记录共用一份档案。" action={<Button type="primary" onClick={() => edit()}>新建客户</Button>} />
    <Panel title={`客户档案 · ${rows.length}`}>
      <div className="toolbar"><Input.Search aria-label="搜索客户" placeholder="客户姓名、电话、顾问" value={query} onChange={e => setQuery(e.target.value)} allowClear style={{ maxWidth: 320 }} /><Select aria-label="客户阶段" value={stage} onChange={setStage} options={options(['全部', '新线索', '跟进中', '已成交'])} style={{ width: 140 }} /><Select aria-label="会员身份" value={member} onChange={setMember} options={options(['全部', '会员', '非会员'])} style={{ width: 140 }} /></div>
      <Table<Customer> rowKey="id" dataSource={rows} size="middle" scroll={{ x: 'max-content' }} locale={{ emptyText: empty(Boolean(query || stage !== '全部' || member !== '全部'), '客户') }} columns={[
        { title: '客户', dataIndex: 'name', render: (_, c) => <Button type="link" onClick={() => setDetailId(c.id)}>{c.name}</Button> },
        { title: '联系电话', dataIndex: 'phone' }, { title: '来源', dataIndex: 'source' }, { title: '顾问', dataIndex: 'advisor' },
        { title: '阶段', dataIndex: 'stage', render: value => <StatusTag value={value} /> },
        { title: '会员', dataIndex: 'member', render: value => value ? <Tag color="gold">会员</Tag> : '普通客户' },
        { title: '最近跟进', render: (_, c) => c.notes.length ? dateText(c.notes[c.notes.length - 1].at) : '待首次跟进' },
        { title: '操作', render: (_, c) => <div className="table-links"><Button type="link" onClick={() => setDetailId(c.id)}>查看档案</Button><Button type="link" onClick={() => edit(c)}>编辑</Button></div> },
      ]} />
    </Panel>
    <Drawer title={customer ? `${customer.name} · 客户档案` : '客户档案'} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} size={760}>
      {customer ? <div className="page-stack">
        <Descriptions column={{ xs: 1, sm: 2 }} items={[{ key: 'phone', label: '电话', children: customer.phone }, { key: 'advisor', label: '顾问', children: customer.advisor }, { key: 'source', label: '来源', children: customer.source }, { key: 'stage', label: '阶段', children: <StatusTag value={customer.stage} /> }, { key: 'member', label: '身份', children: customer.member ? '会员' : '普通客户' }]} />
        <Space wrap><Button onClick={() => edit(customer)}>编辑档案</Button><Button type="primary" onClick={() => { followForm.resetFields(); setFollowCustomerId(customer.id); setFollowOpen(true); }}>追加跟进</Button><Button onClick={() => navigate('orders')}>进入销售与订单</Button></Space>
        <Panel title="跟进记录">{customer.notes.length ? <ul className="compact-list">{[...customer.notes].reverse().map(n => <li key={n.id}><div><strong>{dateText(n.at)}</strong>{n.nextDate && <Tag>下次回访 {n.nextDate}</Tag>}</div><p>{n.text}</p></li>)}</ul> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无跟进记录" />}</Panel>
        <Panel title={`消费与订单 · ${customerOrders.length}`}><Table<Order> rowKey="id" dataSource={customerOrders} size="middle" scroll={{ x: 'max-content' }} locale={{ emptyText: empty(false, '订单') }} columns={[{ title: '订单', dataIndex: 'number', render: (_, o) => <Button type="link" onClick={() => navigate('orders', o.id)}>{o.number}</Button> }, { title: '商品', render: (_, o) => state.products.find(p => p.id === o.productId)?.name ?? '商品已不存在' }, { title: '报价', dataIndex: 'quoteCents', render: formatMoney }, { title: '订单状态', dataIndex: 'status', render: value => <StatusTag value={value} /> }, { title: '交付', dataIndex: 'delivery', render: value => <StatusTag value={value} /> }]} /></Panel>
      </div> : <Empty description="该客户记录不存在" />}
    </Drawer>
    <FormDrawer title={editId ? '编辑客户' : '新建客户'} open={editorOpen} form={form} busy={busy} close={() => setEditorOpen(false)} finish={async values => { await act({ type: 'SAVE_CUSTOMER', payload: { id: editId, name: values.name, phone: values.phone, source: values.source, advisor: values.advisor, stage: values.stage, member: Boolean(values.member) } }, () => setEditorOpen(false)); }}>
      <Form.Item name="name" label="客户姓名" rules={required}><Input /></Form.Item><Form.Item name="phone" label="联系电话" rules={required}><Input /></Form.Item><Form.Item name="source" label="来源" rules={required}><Input /></Form.Item><Form.Item name="advisor" label="负责顾问" rules={required}><Input /></Form.Item><Form.Item name="stage" label="客户阶段" rules={required}><Select options={options(['新线索', '跟进中', '已成交'])} /></Form.Item><Form.Item name="member" valuePropName="checked"><Checkbox>登记为会员</Checkbox></Form.Item>
    </FormDrawer>
    <FormDrawer title="追加跟进" open={followOpen} form={followForm} busy={busy} close={() => setFollowOpen(false)} finish={async values => { if (followCustomerId) await act({ type: 'ADD_FOLLOWUP', payload: { customerId: followCustomerId, text: values.text, nextDate: values.nextDate } }, () => setFollowOpen(false)); }}>
      <Form.Item name="text" label="跟进内容" rules={required}><Input.TextArea rows={4} /></Form.Item><Form.Item name="nextDate" label="下一次回访日期" rules={required}><Input type="date" /></Form.Item>
    </FormDrawer>
  </div>;
}

export function OrdersPage({ navigate, focusId }: PageProps) {
  const { state } = useCRM();
  const { act, busy } = useAction();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('全部');
  const [detailId, setDetailId] = useState<string>();
  const [mode, setMode] = useState<'create' | 'quote' | 'receipt'>();
  const [actionOrderId, setActionOrderId] = useState<string>();
  const [form] = Form.useForm();
  useEffect(() => { if (focusId) setDetailId(focusId); }, [focusId]);
  const order = state.orders.find(o => o.id === detailId);
  const customer = state.customers.find(c => c.id === order?.customerId);
  const product = state.products.find(p => p.id === order?.productId);
  const formOrder = state.orders.find(o => o.id === actionOrderId);
  const formProduct = state.products.find(p => p.id === formOrder?.productId);
  const rows = state.orders.filter(o => (!query || `${o.number} ${state.customers.find(c => c.id === o.customerId)?.name} ${state.products.find(p => p.id === o.productId)?.name}`.includes(query.trim())) && (status === '全部' || o.status === status));
  function openForm(next: 'create' | 'quote' | 'receipt') {
    form.resetFields();
    setActionOrderId(order?.id);
    form.setFieldsValue(next === 'create' ? { kind: '定制', channel: '门店' } : next === 'quote' ? { quoteYuan: (order?.quoteCents ?? 0) / 100, designVersion: order?.designVersion } : { method: '银行转账', note: '' });
    setMode(next);
  }
  async function save(values: any) {
    if (mode === 'create') await act({ type: 'CREATE_ORDER', payload: { customerId: values.customerId, productId: values.productId, kind: values.kind, channel: values.channel, quoteCents: Math.round(values.quoteYuan * 100), dueDate: values.dueDate } }, () => setMode(undefined));
    if (mode === 'quote' && actionOrderId) await act({ type: 'REQUOTE_ORDER', payload: { orderId: actionOrderId, quoteCents: Math.round(values.quoteYuan * 100), designVersion: values.designVersion } }, () => setMode(undefined));
    if (mode === 'receipt' && actionOrderId) await act({ type: 'ADD_RECEIPT', payload: { orderId: actionOrderId, kind: '收款', amountCents: Math.round(values.amountYuan * 100), method: values.method, note: values.note } }, () => setMode(undefined));
  }
  return <div className="page-stack">
    <PageHeader title="销售与订单" description="报价、生产、交付与资金分别跟踪，保留每次版本和变更。" action={<Button type="primary" onClick={() => openForm('create')}>新建订单</Button>} />
    <Panel title={`订单记录 · ${rows.length}`}><div className="toolbar"><Input.Search aria-label="搜索订单" placeholder="订单号、客户、商品" value={query} onChange={e => setQuery(e.target.value)} allowClear style={{ maxWidth: 320 }} /><Select aria-label="订单状态" value={status} onChange={setStatus} options={options(['全部', '待确认', '已确认', '已取消'])} style={{ width: 140 }} /></div>
      <Table<Order> rowKey="id" dataSource={rows} size="middle" scroll={{ x: 'max-content' }} locale={{ emptyText: empty(Boolean(query || status !== '全部'), '订单') }} columns={[
        { title: '订单号', dataIndex: 'number', render: (_, o) => <Button type="link" onClick={() => setDetailId(o.id)}>{o.number}</Button> },
        { title: '客户 / 商品', render: (_, o) => <><div>{state.customers.find(c => c.id === o.customerId)?.name ?? '—'}</div><small>{state.products.find(p => p.id === o.productId)?.name ?? '—'}</small></> },
        { title: '报价', dataIndex: 'quoteCents', render: formatMoney }, { title: '待收余额', render: (_, o) => formatMoney(orderBalance(state, o.id).dueCents) },
        { title: '订单', dataIndex: 'status', render: value => <StatusTag value={value} /> }, { title: '生产', dataIndex: 'production', render: value => <StatusTag value={value} /> }, { title: '交付', dataIndex: 'delivery', render: value => <StatusTag value={value} /> }, { title: '资金', render: (_, o) => <StatusTag value={fundsStatus(state, o.id)} /> },
        { title: '交期', dataIndex: 'dueDate' }, { title: '操作', render: (_, o) => <Button type="link" onClick={() => setDetailId(o.id)}>处理订单</Button> },
      ]} />
    </Panel>
    <Drawer title={order ? `${order.number} · 订单详情` : '订单详情'} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} size={840}>
      {order ? <div className="page-stack">
        <Descriptions column={{ xs: 1, sm: 2 }} items={[{ key: 'customer', label: '客户', children: <Button type="link" onClick={() => navigate('customers', order.customerId)}>{customer?.name ?? '客户已不存在'}</Button> }, { key: 'product', label: '商品 / 设计', children: <Button type="link" onClick={() => navigate('products', order.productId)}>{product?.name ?? '商品已不存在'} · {order.designVersion}</Button> }, { key: 'kind', label: '类型 / 渠道', children: `${order.kind} / ${order.channel}` }, { key: 'due', label: '交期', children: order.dueDate }, { key: 'status', label: '订单', children: <StatusTag value={order.status} /> }, { key: 'production', label: '生产', children: <StatusTag value={order.production} /> }, { key: 'delivery', label: '交付', children: <StatusTag value={order.delivery} /> }, { key: 'created', label: '建立日期', children: dateText(order.createdAt) }]} />
        <div className="metric-line"><span>报价 <strong>{formatMoney(order.quoteCents)}</strong></span><span>实际成本 <strong>{formatMoney(orderCost(state, order.id))}</strong></span><span>待收余额 <strong>{formatMoney(orderBalance(state, order.id).dueCents)}</strong></span></div>
        <div className="metric-line"><span>已核验收款 <strong>{formatMoney(orderBalance(state, order.id).receivedCents)}</strong></span><span>已核验退款 <strong>{formatMoney(orderBalance(state, order.id).refundedCents)}</strong></span><span>待核验净额 <strong>{formatMoney(orderBalance(state, order.id).pendingCents)}</strong></span></div>
        <div>资金状态：<StatusTag value={fundsStatus(state, order.id)} /></div>
        <Space wrap>
          {order.status !== '已取消' && order.delivery !== '已交付' && <Button disabled={busy} onClick={() => openForm('quote')}>修改报价</Button>}
          {order.status === '待确认' && <Button type="primary" loading={busy} onClick={() => void act({ type: 'CONFIRM_ORDER', payload: { orderId: order.id } })}>确认订单</Button>}
          {order.status === '已确认' && order.kind === '定制' && order.production === '待排产' && <Button type="primary" loading={busy} onClick={() => void act({ type: 'START_PRODUCTION', payload: { orderId: order.id } })}>开始生产</Button>}
          <Button onClick={() => navigate('factory', order.id)}>查看工厂任务</Button>
          {order.status === '已确认' && order.production === '已合格' && order.delivery === '未交付' && <Button type="primary" loading={busy} onClick={() => void act({ type: 'DELIVER_ORDER', payload: { orderId: order.id } })}>登记合格交付</Button>}
          {order.status !== '已取消' && <Button disabled={busy} onClick={() => openForm('receipt')}>登记收款</Button>}
          <Button onClick={() => navigate('finance', order.id)}>查看财务与核验</Button>
          {order.status !== '已取消' && order.delivery === '未交付' && <Popconfirm title="取消订单并保留原记录？" description="已登记的材料、费用与收款记录仍保留；退款由财务另行处理。" onConfirm={() => act({ type: 'CANCEL_ORDER', payload: { orderId: order.id } })}><Button danger disabled={busy}>取消订单</Button></Popconfirm>}
        </Space>
        <Panel title="报价与设计版本"><Table rowKey="version" dataSource={order.quoteHistory} size="middle" scroll={{ x: 'max-content' }} pagination={false} columns={[{ title: '报价版本', dataIndex: 'version', render: value => `v${value}` }, { title: '设计版本', dataIndex: 'designVersion' }, { title: '报价', dataIndex: 'amountCents', render: formatMoney }, { title: '时间', dataIndex: 'at', render: dateText }]} /></Panel>
        <Panel title="实际用料与来源"><Table rowKey="id" dataSource={state.usages.filter(u => u.orderId === order.id)} size="middle" scroll={{ x: 'max-content' }} pagination={false} locale={{ emptyText: empty(false, '用料记录') }} columns={[{ title: '批次 / 来源', render: (_, u) => <><div>{u.batchId}</div><small>{state.batches.find(b => b.id === u.batchId)?.source ?? '—'}</small></> }, { title: '领料', dataIndex: 'issuedMg', render: formatWeight }, { title: '净含金', dataIndex: 'netMg', render: formatWeight }, { title: '退料', dataIndex: 'returnedMg', render: formatWeight }, { title: '回收料', dataIndex: 'recoveredMg', render: formatWeight }, { title: '在制 / 待查', render: (_, u) => { const gap=u.issuedMg-u.netMg-u.returnedMg-u.recoveredMg-u.lossMg; return gap>0 ? `${order.production==='制作中'||order.production==='返工中'?'在制':'待查'} ${formatWeight(gap)}` : '已平衡'; } }, { title: '损耗', dataIndex: 'lossMg', render: formatWeight }, { title: '损耗确认', dataIndex: 'lossConfirmed', render: value => value ? '已确认' : '未确认' }]} /></Panel>
        <Panel title="加工与其他实际费用"><Table rowKey="id" dataSource={state.expenses.filter(e => e.orderId === order.id)} size="middle" scroll={{ x: 'max-content' }} pagination={false} locale={{ emptyText: empty(false, '费用') }} columns={[{ title: '类别', dataIndex: 'type' }, { title: '金额', dataIndex: 'amountCents', render: formatMoney }, { title: '原因', dataIndex: 'reason' }, { title: '时间', dataIndex: 'at', render: dateText }]} /></Panel>
        <Panel title="共用收退款记录"><Table rowKey="id" dataSource={state.receipts.filter(r => r.orderId === order.id)} size="middle" scroll={{ x: 'max-content' }} pagination={false} locale={{ emptyText: empty(false, '收退款记录') }} columns={[{ title: '类型', dataIndex: 'kind' }, { title: '金额', dataIndex: 'amountCents', render: formatMoney }, { title: '方式', dataIndex: 'method' }, { title: '财务核验', dataIndex: 'verified', render: value => <StatusTag value={value ? '已核验' : '待核验'} /> }, { title: '备注', dataIndex: 'note' }]} /></Panel>
      </div> : <Empty description="该订单记录不存在" />}
    </Drawer>
    <FormDrawer title={mode === 'create' ? '新建订单' : mode === 'quote' ? '修改报价与设计版本' : '登记订单收款'} open={Boolean(mode)} form={form} busy={busy} close={() => setMode(undefined)} finish={save}>
      {mode === 'create' && <><Form.Item name="customerId" label="客户" rules={required}><Select showSearch optionFilterProp="label" options={state.customers.map(c => ({ value: c.id, label: `${c.name} · ${c.phone}` }))} /></Form.Item><Form.Item name="productId" label="已确认商品" rules={required}><Select showSearch optionFilterProp="label" options={state.products.filter(p => p.status === '已确认').map(p => ({ value: p.id, label: `${p.name} · ${p.designVersion}` }))} /></Form.Item><Form.Item name="kind" label="订单类型" rules={required}><Select options={options(['现货', '定制'])} /></Form.Item><Form.Item name="channel" label="销售渠道" rules={required}><Input /></Form.Item><Form.Item name="dueDate" label="交付日期" rules={required}><Input type="date" /></Form.Item></>}
      {(mode === 'create' || mode === 'quote') && <MoneyInput name="quoteYuan" label="销售报价" min={0.01} />}
      {mode === 'quote' && <Form.Item name="designVersion" label="本次设计版本" rules={required}><Select options={(formProduct?.versions ?? []).map(v => ({ value: v.version, label: v.version }))} /></Form.Item>}
      {mode === 'receipt' && <><Alert type="info" showIcon title="此记录与财务共用；保存后由财务核验。" style={{ marginBottom: 20 }} /><MoneyInput name="amountYuan" label="收款金额" min={0.01} /><Form.Item name="method" label="收款方式" rules={required}><Select options={options(['银行转账', '微信', '支付宝', '现金', '其他'])} /></Form.Item><Form.Item name="note" label="交易备注 / 依据" rules={required}><Input.TextArea rows={3} /></Form.Item></>}
    </FormDrawer>
  </div>;
}

export function ProductsPage({ navigate, focusId }: PageProps) {
  const { state } = useCRM();
  const { act, busy } = useAction();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('全部');
  const [detailId, setDetailId] = useState<string>();
  const [editId, setEditId] = useState<string>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [form] = Form.useForm();
  useEffect(() => { if (focusId) setDetailId(focusId); }, [focusId]);
  const product = state.products.find(p => p.id === detailId);
  const rows = state.products.filter(p => (!query || `${p.name} ${p.series} ${p.designVersion}`.includes(query.trim())) && (status === '全部' || p.status === status));
  function edit(value?: Product) {
    form.resetFields(); setEditId(value?.id);
    form.setFieldsValue(value ? { ...value, goldGrams: value.goldMg / 1000, accessoryYuan: value.accessoryCents / 100, processingYuan: value.processingCents / 100, salesFeeYuan: value.salesFeeCents / 100 } : { designVersion: 'v1', purity: '足金999', status: '草稿', accessoryYuan: 0, processingYuan: 0, salesFeeYuan: 0 });
    setEditorOpen(true);
  }
  return <div className="page-stack"><PageHeader title="商品与设计" description="方案确认后可被订单引用，规格和成本变化须登记新的设计版本。" action={<Button type="primary" onClick={() => edit()}>创建商品方案</Button>} />
    <Panel title={`商品方案 · ${rows.length}`}><div className="toolbar"><Input.Search aria-label="搜索商品" placeholder="名称、系列、设计版本" value={query} onChange={e => setQuery(e.target.value)} allowClear style={{ maxWidth: 320 }} /><Select aria-label="方案状态" value={status} onChange={setStatus} options={options(['全部', '草稿', '已确认'])} style={{ width: 140 }} /></div>
      <Table<Product> rowKey="id" dataSource={rows} size="middle" scroll={{ x: 'max-content' }} locale={{ emptyText: empty(Boolean(query || status !== '全部'), '商品方案') }} columns={[{ title: '商品', dataIndex: 'name', render: (_, p) => <Button type="link" onClick={() => setDetailId(p.id)}>{p.name}</Button> }, { title: '系列', dataIndex: 'series' }, { title: '设计版本', dataIndex: 'designVersion' }, { title: '纯度', dataIndex: 'purity' }, { title: '标准含金', dataIndex: 'goldMg', render: formatWeight }, { title: '配件 / 加工 / 销售费', render: (_, p) => `${formatMoney(p.accessoryCents)} / ${formatMoney(p.processingCents)} / ${formatMoney(p.salesFeeCents)}` }, { title: '状态', dataIndex: 'status', render: value => <StatusTag value={value} /> }, { title: '操作', render: (_, p) => <div className="table-links"><Button type="link" onClick={() => setDetailId(p.id)}>查看版本</Button><Button type="link" onClick={() => edit(p)}>编辑方案</Button></div> }]} />
    </Panel>
    <Drawer title={product ? `${product.name} · 商品方案` : '商品方案'} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} size={760}>
      {product ? <div className="page-stack"><Descriptions column={{ xs: 1, sm: 2 }} items={[{ key: 'series', label: '系列', children: product.series }, { key: 'version', label: '当前版本', children: product.designVersion }, { key: 'purity', label: '纯度', children: product.purity }, { key: 'gold', label: '标准含金', children: formatWeight(product.goldMg) }, { key: 'status', label: '状态', children: <StatusTag value={product.status} /> }]} /><Button onClick={() => edit(product)}>编辑方案</Button>
        <Panel title="设计版本历史"><Table rowKey="version" dataSource={product.versions} size="middle" scroll={{ x: 'max-content' }} pagination={false} columns={[{ title: '版本', dataIndex: 'version' }, { title: '含金', dataIndex: 'goldMg', render: formatWeight }, { title: '配件', dataIndex: 'accessoryCents', render: formatMoney }, { title: '加工', dataIndex: 'processingCents', render: formatMoney }, { title: '销售费', dataIndex: 'salesFeeCents', render: formatMoney }, { title: '时间', dataIndex: 'at', render: dateText }]} /></Panel>
        <Panel title="引用此商品的订单"><Table<Order> rowKey="id" dataSource={state.orders.filter(o => o.productId === product.id)} size="middle" scroll={{ x: 'max-content' }} pagination={false} locale={{ emptyText: empty(false, '引用订单') }} columns={[{ title: '订单', dataIndex: 'number', render: (_, o) => <Button type="link" onClick={() => navigate('orders', o.id)}>{o.number}</Button> }, { title: '订单设计版本', dataIndex: 'designVersion' }, { title: '客户', render: (_, o) => state.customers.find(c => c.id === o.customerId)?.name }, { title: '状态', dataIndex: 'status', render: value => <StatusTag value={value} /> }]} /></Panel>
      </div> : <Empty description="该商品记录不存在" />}
    </Drawer>
    <FormDrawer title={editId ? '编辑商品方案' : '创建商品方案'} open={editorOpen} form={form} busy={busy} close={() => setEditorOpen(false)} finish={async values => { await act({ type: 'SAVE_PRODUCT', payload: { id: editId, name: values.name, series: values.series, designVersion: values.designVersion, purity: values.purity, goldMg: Math.round(values.goldGrams * 1000), accessoryCents: Math.round(values.accessoryYuan * 100), processingCents: Math.round(values.processingYuan * 100), salesFeeCents: Math.round(values.salesFeeYuan * 100), status: values.status } }, () => setEditorOpen(false)); }}>
      {editId && <Alert type="info" showIcon title="规格或费用改变时，请手动填写未使用过的新版本号。历史版本仍保留。" style={{ marginBottom: 20 }} />}
      <Form.Item name="name" label="商品名称" rules={required}><Input /></Form.Item><Form.Item name="series" label="系列" rules={required}><Input /></Form.Item><Form.Item name="designVersion" label="设计版本号" rules={required}><Input /></Form.Item><Form.Item name="purity" label="纯度" rules={required}><Input /></Form.Item><WeightInput name="goldGrams" label="标准含金重量" /><MoneyInput name="accessoryYuan" label="配件费用" /><MoneyInput name="processingYuan" label="标准加工费用" /><MoneyInput name="salesFeeYuan" label="销售费用" /><Form.Item name="status" label="方案状态" rules={required}><Select options={options(['草稿', '已确认'])} /></Form.Item>
    </FormDrawer>
  </div>;
}

export function FactoryPage({ navigate, focusId }: PageProps) {
  const { state } = useCRM();
  const { act, busy } = useAction();
  const [query, setQuery] = useState('');
  const [production, setProduction] = useState('全部');
  const [detailId, setDetailId] = useState<string>();
  const [mode, setMode] = useState<'usage' | 'expense' | 'inspect'>();
  const [actionOrderId, setActionOrderId] = useState<string>();
  const [form] = Form.useForm();
  const selectedBatch = Form.useWatch('batchId', form);
  useEffect(() => { if (focusId) setDetailId(focusId); }, [focusId]);
  const order = state.orders.find(o => o.id === detailId);
  const product = state.products.find(p => p.id === order?.productId);
  const rows = state.orders.filter(o => o.status === '已确认' && (!query || `${o.number} ${state.products.find(p => p.id === o.productId)?.name}`.includes(query.trim())) && (production === '全部' || o.production === production));
  function openForm(next: 'usage' | 'expense' | 'inspect') {
    form.resetFields();
    setActionOrderId(order?.id);
    form.setFieldsValue(next === 'usage' ? { returnedGrams: 0, recoveredGrams: 0, lossGrams: 0, lossConfirmed: false } : next === 'expense' ? { type: order?.production === '返工中' ? '返工' : '加工' } : { pass: true });
    setMode(next);
  }
  function selectUsageBatch(batchId: string) {
    const usage = state.usages.find(u => u.orderId === actionOrderId && u.batchId === batchId);
    form.setFieldsValue({ issuedGrams: usage ? usage.issuedMg / 1000 : undefined, netGrams: usage ? usage.netMg / 1000 : undefined, returnedGrams: (usage?.returnedMg ?? 0) / 1000, recoveredGrams: (usage?.recoveredMg ?? 0) / 1000, lossGrams: (usage?.lossMg ?? 0) / 1000, lossConfirmed: usage?.lossConfirmed ?? false });
  }
  async function save(values: any) {
    if (!actionOrderId) return;
    if (mode === 'usage') await act({ type: 'SAVE_USAGE', payload: { orderId: actionOrderId, batchId: values.batchId, issuedMg: Math.round(values.issuedGrams * 1000), netMg: Math.round(values.netGrams * 1000), returnedMg: Math.round(values.returnedGrams * 1000), recoveredMg: Math.round(values.recoveredGrams * 1000), lossMg: Math.round(values.lossGrams * 1000), lossConfirmed: Boolean(values.lossConfirmed) } }, () => setMode(undefined));
    if (mode === 'expense') await act({ type: 'ADD_EXPENSE', payload: { orderId: actionOrderId, type: values.type, amountCents: Math.round(values.amountYuan * 100), reason: values.reason } }, () => setMode(undefined));
    if (mode === 'inspect') await act({ type: 'INSPECT_ORDER', payload: { orderId: actionOrderId, pass: values.pass, reason: values.reason } }, () => setMode(undefined));
  }
  return <div className="page-stack"><PageHeader title="工厂与质检" description="制作任务与销售共用订单；领料、损耗、返工和质检均保留依据。" />
    <Panel title={`制作任务 · ${rows.length}`}><div className="toolbar"><Input.Search aria-label="搜索工厂任务" placeholder="订单号、商品" value={query} onChange={e => setQuery(e.target.value)} allowClear style={{ maxWidth: 320 }} /><Select aria-label="制作状态" value={production} onChange={setProduction} options={options(['全部', '待排产', '制作中', '待质检', '返工中', '已合格'])} style={{ width: 140 }} /></div>
      <Table<Order> rowKey="id" dataSource={rows} size="middle" scroll={{ x: 'max-content' }} locale={{ emptyText: empty(Boolean(query || production !== '全部'), '已确认制作任务') }} columns={[{ title: '任务 / 订单', dataIndex: 'number', render: (_, o) => <Button type="link" onClick={() => setDetailId(o.id)}>{o.number}</Button> }, { title: '商品 / 设计版本', render: (_, o) => <><div>{state.products.find(p => p.id === o.productId)?.name}</div><small>{o.designVersion}</small></> }, { title: '制作状态', dataIndex: 'production', render: value => <StatusTag value={value} /> }, { title: '交期', dataIndex: 'dueDate' }, { title: '用料批次', render: (_, o) => [...new Set(state.usages.filter(u => u.orderId === o.id).map(u => u.batchId))].join('、') || '未领料' }, { title: '实际成本', render: (_, o) => formatMoney(orderCost(state, o.id)) }, { title: '操作', render: (_, o) => <Button type="link" onClick={() => setDetailId(o.id)}>处理制作任务</Button> }]} />
    </Panel>
    <Drawer title={order ? `${order.number} · 制作与质检` : '制作任务'} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} size={840}>
      {order ? <div className="page-stack"><Descriptions column={{ xs: 1, sm: 2 }} items={[{ key: 'product', label: '商品 / 设计', children: `${product?.name ?? '—'} / ${order.designVersion}` }, { key: 'due', label: '交期', children: order.dueDate }, { key: 'status', label: '订单状态', children: <StatusTag value={order.status} /> }, { key: 'production', label: '制作状态', children: <StatusTag value={order.production} /> }]} />
        <Space wrap><Button onClick={() => navigate('orders', order.id)}>查看销售订单</Button><Button onClick={() => navigate('inventory')}>查看采购库存</Button>{order.status === '已确认' && order.kind === '定制' && order.production === '待排产' && <Button type="primary" loading={busy} onClick={() => void act({ type: 'START_PRODUCTION', payload: { orderId: order.id } })}>开始生产</Button>}{order.status === '已确认' && ['制作中', '待质检', '返工中'].includes(order.production) && <><Button disabled={busy} onClick={() => openForm('usage')}>登记实际用料</Button><Button disabled={busy} onClick={() => openForm('expense')}>登记加工 / 返工费用</Button></>}{order.status === '已确认' && (['待质检', '返工中'].includes(order.production) || (order.kind === '现货' && order.production !== '已合格')) && <Button type="primary" disabled={busy} onClick={() => openForm('inspect')}>{order.production === '返工中' ? '再次复检' : '登记质检结果'}</Button>}</Space>
        {order.status !== '已确认' && <Alert type="info" title="该订单尚未确认或已取消，不能进行生产操作。" />}
        <Panel title="材料来源与结存"><Table rowKey="id" dataSource={state.batches.filter(b => state.usages.some(u => u.orderId === order.id && u.batchId === b.id))} size="middle" scroll={{ x: 'max-content' }} pagination={false} locale={{ emptyText: empty(false, '领料来源') }} columns={[{ title: '批次', dataIndex: 'id' }, { title: '材料 / 纯度', render: (_, b) => `${b.material} / ${b.purity}` }, { title: '来源', dataIndex: 'source' }, { title: '仓位', dataIndex: 'location' }, { title: '采购单价', dataIndex: 'unitCostCents', render: value => `${formatMoney(value)} / g` }, { title: '当前结存', render: (_, b) => formatWeight(batchAvailable(state, b.id)) }]} /></Panel>
        <Panel title="实际用料记录"><Table rowKey="id" dataSource={state.usages.filter(u => u.orderId === order.id)} size="middle" scroll={{ x: 'max-content' }} pagination={false} locale={{ emptyText: empty(false, '用料记录') }} columns={[{ title: '批次', dataIndex: 'batchId' }, { title: '领料', dataIndex: 'issuedMg', render: formatWeight }, { title: '净含金', dataIndex: 'netMg', render: formatWeight }, { title: '退料', dataIndex: 'returnedMg', render: formatWeight }, { title: '回收料', dataIndex: 'recoveredMg', render: formatWeight }, { title: '在制 / 待查', render: (_, u) => { const gap=u.issuedMg-u.netMg-u.returnedMg-u.recoveredMg-u.lossMg; return gap>0 ? `${order.production==='制作中'||order.production==='返工中'?'在制':'待查'} ${formatWeight(gap)}` : '已平衡'; } }, { title: '损耗', dataIndex: 'lossMg', render: formatWeight }, { title: '损耗确认', dataIndex: 'lossConfirmed', render: value => value ? '已确认' : '未确认' }]} /></Panel>
        <Panel title="加工与返工费用"><Table rowKey="id" dataSource={state.expenses.filter(e => e.orderId === order.id)} size="middle" scroll={{ x: 'max-content' }} pagination={false} locale={{ emptyText: empty(false, '费用记录') }} columns={[{ title: '类型', dataIndex: 'type' }, { title: '实际金额', dataIndex: 'amountCents', render: formatMoney }, { title: '原因', dataIndex: 'reason' }, { title: '时间', dataIndex: 'at', render: dateText }]} /></Panel>
        <Panel title="质检与复检历史">{order.qualityNotes.length ? <ul className="compact-list">{order.qualityNotes.map((note, index) => <li key={index}>{note}</li>)}</ul> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未登记质检结果" />}</Panel>
      </div> : <Empty description="该订单记录不存在" />}
    </Drawer>
    <FormDrawer title={mode === 'usage' ? '登记实际用料' : mode === 'expense' ? '登记实际费用' : '登记质检与复检结果'} open={Boolean(mode)} form={form} busy={busy} close={() => setMode(undefined)} finish={save}>
      {mode === 'usage' && <><Alert type="info" showIcon title="按订单与批次登记累计实际量；已领料和已退回数量不能减少。领料减去净含金、退料、回收料与损耗的差额为在制，平衡后进入质检；回收料单独记录，不计可用库存。" style={{ marginBottom: 20 }} /><Form.Item name="batchId" label="来源批次" rules={required}><Select showSearch optionFilterProp="label" onChange={selectUsageBatch} options={state.batches.map(b => ({ value: b.id, label: `${b.id} · ${b.material} ${b.purity} · ${b.source} · 余 ${formatWeight(batchAvailable(state, b.id))}`, disabled: batchAvailable(state, b.id) <= 0 && !state.usages.some(u => u.orderId === actionOrderId && u.batchId === b.id) }))} /></Form.Item>{selectedBatch && <p>所选批次当前结存：{formatWeight(batchAvailable(state, selectedBatch))}</p>}<WeightInput name="issuedGrams" label="累计实际领料重量" /><WeightInput name="netGrams" label="累计实际净含金重量" /><WeightInput name="returnedGrams" label="累计退料重量" /><WeightInput name="recoveredGrams" label="累计回收料重量" /><WeightInput name="lossGrams" label="累计损耗重量" /><Form.Item name="lossConfirmed" valuePropName="checked"><Checkbox>已核实并确认登记损耗</Checkbox></Form.Item></>}
      {mode === 'expense' && <><Form.Item name="type" label="费用类型" rules={required}><Select options={options(['加工', '返工', '其他'])} /></Form.Item><MoneyInput name="amountYuan" label="实际费用" min={0.01} /><Form.Item name="reason" label="费用原因 / 依据" rules={required}><Input.TextArea rows={3} /></Form.Item></>}
      {mode === 'inspect' && <><Form.Item name="pass" label="质检结果" rules={required}><Select options={[{ value: true, label: '质检合格' }, { value: false, label: '退回返工' }]} /></Form.Item><Form.Item name="reason" label="检查结论 / 返工原因" rules={required}><Input.TextArea rows={4} /></Form.Item><Alert type="info" title="定制订单须完成用料平衡并确认非零损耗；返工后登记实际费用并再次复检。" /></>}
    </FormDrawer>
  </div>;
}

export function AftercarePage({ navigate, focusId }: PageProps) {
  const { state } = useCRM();
  const { act, busy } = useAction();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('全部');
  const [detailId, setDetailId] = useState<string>();
  const [mode, setMode] = useState<'create' | 'update'>();
  const [actionCaseId, setActionCaseId] = useState<string>();
  const [form] = Form.useForm();
  useEffect(() => { if (focusId) setDetailId(focusId); }, [focusId]);
  const service = state.cases.find(c => c.id === detailId);
  const order = state.orders.find(o => o.id === service?.orderId);
  const rows = state.cases.filter(c => (!query || `${state.orders.find(o => o.id === c.orderId)?.number} ${c.reason} ${c.type}`.includes(query.trim())) && (status === '全部' || c.status === status));
  function openForm(next: 'create' | 'update') {
    form.resetFields(); setActionCaseId(service?.id); form.setFieldsValue(next === 'create' ? { type: '变更' } : { status: service?.status, result: service?.result }); setMode(next);
  }
  return <div className="page-stack"><PageHeader title="售后与服务" description="记录订单变更、退货、维修和取消处理，退款交由财务登记。" action={<Button type="primary" onClick={() => openForm('create')}>新建服务单</Button>} />
    <Panel title={`服务记录 · ${rows.length}`}><div className="toolbar"><Input.Search aria-label="搜索服务单" placeholder="订单号、原因、类型" value={query} onChange={e => setQuery(e.target.value)} allowClear style={{ maxWidth: 320 }} /><Select aria-label="服务处理状态" value={status} onChange={setStatus} options={options(['全部', '待处理', '处理中', '已关闭'])} style={{ width: 140 }} /></div>
      <Table<ServiceCase> rowKey="id" dataSource={rows} size="middle" scroll={{ x: 'max-content' }} locale={{ emptyText: empty(Boolean(query || status !== '全部'), '服务单') }} columns={[{ title: '服务单', dataIndex: 'id', render: (_, c) => <Button type="link" onClick={() => setDetailId(c.id)}>{c.id}</Button> }, { title: '关联订单', render: (_, c) => state.orders.find(o => o.id === c.orderId)?.number ?? '—' }, { title: '类型', dataIndex: 'type' }, { title: '原因', dataIndex: 'reason', ellipsis: true }, { title: '状态', dataIndex: 'status', render: value => <StatusTag value={value} /> }, { title: '登记时间', dataIndex: 'at', render: dateText }, { title: '操作', render: (_, c) => <Button type="link" onClick={() => setDetailId(c.id)}>处理服务单</Button> }]} />
    </Panel>
    <Drawer title={service ? `${service.id} · 服务处理` : '服务处理'} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} size={680}>
      {service ? <div className="page-stack"><Descriptions column={{ xs: 1, sm: 2 }} items={[{ key: 'order', label: '关联订单', children: <Button type="link" onClick={() => navigate('orders', service.orderId)}>{order?.number ?? service.orderId}</Button> }, { key: 'type', label: '服务类型', children: service.type }, { key: 'status', label: '处理状态', children: <StatusTag value={service.status} /> }, { key: 'at', label: '登记时间', children: dateText(service.at) }]} /><Panel title="申请原因"><p>{service.reason}</p></Panel><Panel title="处理结果"><p>{service.result || '尚未登记处理结果'}</p></Panel><Space wrap><Button type="primary" onClick={() => openForm('update')}>更新处理状态与结果</Button><Button onClick={() => navigate('orders', service.orderId)}>处理关联订单</Button><Button onClick={() => navigate('factory', service.orderId)}>进入工厂处理</Button><Button onClick={() => navigate('finance', service.orderId)}>进入财务处理</Button></Space><Alert type="info" title="服务单保存不自动取消订单或退款；通过关联模块执行并保留业务记录。" /></div> : <Empty description="该服务记录不存在" />}
    </Drawer>
    <FormDrawer title={mode === 'create' ? '新建订单服务单' : '更新处理状态与结果'} open={Boolean(mode)} form={form} busy={busy} close={() => setMode(undefined)} finish={async values => {
      if (mode === 'create') await act({ type: 'SAVE_CASE', payload: { orderId: values.orderId, type: values.type, reason: values.reason } }, () => setMode(undefined));
      if (mode === 'update' && actionCaseId) await act({ type: 'UPDATE_CASE', payload: { caseId: actionCaseId, status: values.status, result: values.result } }, () => setMode(undefined));
    }}>
      {mode === 'create' ? <><Form.Item name="orderId" label="关联订单" rules={required}><Select showSearch optionFilterProp="label" options={state.orders.map(o => ({ value: o.id, label: `${o.number} · ${state.customers.find(c => c.id === o.customerId)?.name ?? '—'}` }))} /></Form.Item><Form.Item name="type" label="服务类型" rules={required}><Select options={options(['变更', '退货', '维修', '取消'])} /></Form.Item><Form.Item name="reason" label="申请原因" rules={required}><Input.TextArea rows={4} /></Form.Item></> : <><Form.Item name="status" label="处理状态" rules={required}><Select options={options(['待处理', '处理中', '已关闭'])} /></Form.Item><Form.Item name="result" label="处理结果 / 下一步" rules={required}><Input.TextArea rows={4} /></Form.Item></>}
    </FormDrawer>
  </div>;
}
