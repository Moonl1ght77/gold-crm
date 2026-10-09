import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Drawer, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, Tag, Typography } from 'antd';
import { PlusOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCRM } from './store';
import { batchAvailable, formatMoney, formatWeight, orderBalance, orderCost } from './domain';
import { PageHeader, Panel, StatusTag, downloadFile } from './ui';
import type { ApiLog, Batch, Campaign, Order, PageProps, Receipt, Role } from './types';

const roles: Role[] = ['经营负责人', '门店顾问', '品牌运营', '产品设计', '采购仓库', '工厂质检', '财务', '管理员'];
const time = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });
const toCents = (value: number) => Math.round(value * 100);
const toMg = (value: number) => Math.round(value * 1000);
const required = [{ required: true, message: '请填写此项' }];

interface BatchValues { material: Batch['material']; purity: string; source: string; unitCost: number; location: string; quantity: number }
interface AdjustmentValues { quantity: number; reason: string }

export function InventoryPage({ navigate, focusId }: PageProps) {
  const { state, run, busy } = useCRM();
  const [query, setQuery] = useState('');
  const [material, setMaterial] = useState<string>('全部');
  const [detailId, setDetailId] = useState<string>();
  const [batchOpen, setBatchOpen] = useState(false);
  const [adjustId, setAdjustId] = useState<string>();
  const [batchForm] = Form.useForm<BatchValues>();
  const [adjustForm] = Form.useForm<AdjustmentValues>();
  useEffect(() => { if (focusId) setDetailId(focusId); }, [focusId]);
  const selected = state.batches.find(batch => batch.id === detailId);
  const movements = state.movements.filter(movement => movement.batchId === detailId);
  const usages = state.usages.filter(usage => usage.batchId === detailId);
  const originalQuantity = movements.filter(movement => movement.kind === '入库').reduce((sum, movement) => sum + movement.quantityMg, 0);
  const filtered = state.batches.filter(batch => (material === '全部' || batch.material === material) && [batch.id, batch.purity, batch.source, batch.location].some(value => value.toLowerCase().includes(query.trim().toLowerCase())));
  const total = (kind: Batch['material']) => state.batches.filter(batch => batch.material === kind).reduce((sum, batch) => sum + batchAvailable(state, batch.id), 0);
  const orderLink = (id?: string) => id ? <Button type="link" onClick={() => navigate('orders', id)}>{state.orders.find(order => order.id === id)?.number ?? id}</Button> : '—';

  function openBatch() {
    batchForm.resetFields();
    batchForm.setFieldsValue({ material: '黄金', purity: 'Au999', unitCost: state.settings.goldCents / 100, location: '门店原料库' });
    setBatchOpen(true);
  }
  function openAdjustment(id: string) {
    adjustForm.resetFields();
    setAdjustId(id);
  }
  async function saveBatch(values: BatchValues) {
    if (busy) return;
    try {
      await run({ type: 'SAVE_BATCH', payload: { material: values.material, purity: values.purity.trim(), source: values.source.trim(), unitCostCents: toCents(values.unitCost), location: values.location.trim(), quantityMg: toMg(values.quantity) } });
      setBatchOpen(false);
      batchForm.resetFields();
    } catch { /* 保存失败由统一提示处理，输入保留。 */ }
  }
  async function adjustStock(values: AdjustmentValues) {
    if (!adjustId || busy) return;
    try {
      await run({ type: 'ADJUST_STOCK', payload: { batchId: adjustId, quantityMg: toMg(values.quantity), reason: values.reason.trim() } });
      setAdjustId(undefined);
      adjustForm.resetFields();
    } catch { /* 保存失败保留盘点依据。 */ }
  }

  return <div className="page-stack">
    <PageHeader title="采购与库存" description="批次成本固定留档，领退料、盘点与用料均可追查。" action={<Button type="primary" icon={<PlusOutlined />} onClick={openBatch} disabled={busy}>采购入库</Button>} />
    <div className="metric-line"><span>黄金可用 <strong>{formatWeight(total('黄金'))}</strong></span><span>白银可用 <strong>{formatWeight(total('白银'))}</strong></span><span>库存批次 <strong>{state.batches.length}</strong></span></div>
    <Panel title="原料批次" extra={<span className="muted">数量以克显示，按毫克保存</span>}>
      <div className="toolbar"><Input.Search aria-label="搜索库存批次" placeholder="批次、来源、成色、库位" allowClear value={query} onChange={event => setQuery(event.target.value)} style={{ width: 280 }} /><Select aria-label="原料类型筛选" value={material} onChange={setMaterial} options={['全部', '黄金', '白银'].map(value => ({ label: value, value }))} style={{ width: 130 }} /></div>
      <Table<Batch> rowKey="id" dataSource={filtered} scroll={{ x: 950 }} pagination={{ pageSize: 8, showSizeChanger: false }} locale={{ emptyText: <Empty description={state.batches.length ? '未找到匹配批次，调整搜索或筛选后重试' : '暂无库存，采购入库后会显示在这里'} /> }} columns={[
        { title: '批次 / 原料', key: 'batch', width: 180, render: (_, batch) => <><Button type="link" onClick={() => setDetailId(batch.id)}>{batch.id}</Button><div className="muted">{batch.material} · {batch.purity}</div></> },
        { title: '供应来源', dataIndex: 'source', width: 170 },
        { title: '采购单价', key: 'cost', width: 140, render: (_, batch) => `${formatMoney(batch.unitCostCents)} / g` },
        { title: '可用库存', key: 'available', width: 130, render: (_, batch) => <strong>{formatWeight(batchAvailable(state, batch.id))}</strong> },
        { title: '库位', dataIndex: 'location', width: 130 },
        { title: '入库时间', dataIndex: 'receivedAt', width: 170, render: time },
        { title: '操作', key: 'actions', width: 150, render: (_, batch) => <Space className="table-links"><Button type="link" onClick={() => setDetailId(batch.id)}>详情</Button><Button type="link" onClick={() => openAdjustment(batch.id)} disabled={busy}>盘点调整</Button></Space> },
      ]} />
    </Panel>
    <Drawer title={selected ? `批次 ${selected.id}` : '批次详情'} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} size={860} extra={selected && <Button onClick={() => openAdjustment(selected.id)} disabled={busy}>盘点调整</Button>}>
      {selected ? <div className="page-stack">
        <Descriptions column={{ xs: 1, sm: 2 }} items={[
          { key: 'material', label: '原料 / 成色', children: `${selected.material} · ${selected.purity}` },
          { key: 'source', label: '采购来源', children: selected.source },
          { key: 'location', label: '存放库位', children: selected.location },
          { key: 'cost', label: '固定采购单价', children: `${formatMoney(selected.unitCostCents)} / g` },
          { key: 'original', label: '原始入库量', children: formatWeight(originalQuantity) },
          { key: 'available', label: '当前可用库存', children: formatWeight(batchAvailable(state, selected.id)) },
          { key: 'net', label: '实际净用料', children: formatWeight(usages.reduce((sum, usage) => sum + usage.netMg, 0)) },
          { key: 'recovered', label: '工厂回收量', children: formatWeight(usages.reduce((sum, usage) => sum + usage.recoveredMg, 0)) },
          { key: 'loss', label: '已确认损耗', children: formatWeight(usages.filter(usage => usage.lossConfirmed).reduce((sum, usage) => sum + usage.lossMg, 0)) },
          { key: 'pendingLoss', label: '未确认损耗', children: formatWeight(usages.filter(usage => !usage.lossConfirmed).reduce((sum, usage) => sum + usage.lossMg, 0)) },
        ]} />
        <Tabs items={[
          { key: 'movements', label: '库存流水与领退料', children: <Table rowKey="id" dataSource={[...movements].reverse()} scroll={{ x: 650 }} pagination={false} locale={{ emptyText: '暂无库存流水' }} columns={[
            { title: '动作', dataIndex: 'kind', width: 105 },
            { title: '库存变更', key: 'quantity', width: 120, render: (_, movement) => `${movement.quantityMg > 0 ? '+' : ''}${formatWeight(movement.quantityMg)}` },
            { title: '关联订单', key: 'order', width: 130, render: (_, movement) => orderLink(movement.orderId) },
            { title: '依据', dataIndex: 'reason', width: 220 },
            { title: '时间', dataIndex: 'at', width: 170, render: time },
          ]} /> },
          { key: 'usage', label: '实际用料', children: <Table rowKey="id" dataSource={usages} scroll={{ x: 650 }} pagination={false} locale={{ emptyText: '尚无实际用料，工厂登记后显示' }} columns={[
            { title: '关联订单', key: 'order', render: (_, usage) => orderLink(usage.orderId) },
            { title: '领料量', dataIndex: 'issuedMg', render: formatWeight },
            { title: '退料量', dataIndex: 'returnedMg', render: formatWeight },
            { title: '实际净用料', dataIndex: 'netMg', render: formatWeight },
            { title: '登记时间', dataIndex: 'at', render: time },
          ]} /> },
          { key: 'recovery', label: '回收记录', children: <Table rowKey="id" dataSource={usages.filter(usage => usage.recoveredMg > 0)} pagination={false} locale={{ emptyText: '暂无回收记录' }} columns={[
            { title: '关联订单', key: 'order', render: (_, usage) => orderLink(usage.orderId) },
            { title: '回收量', dataIndex: 'recoveredMg', render: formatWeight },
            { title: '登记时间', dataIndex: 'at', render: time },
          ]} /> },
          { key: 'losses', label: '损耗确认', children: <Table rowKey="id" dataSource={usages.filter(usage => usage.lossMg > 0)} pagination={false} locale={{ emptyText: '暂无损耗记录' }} columns={[
            { title: '关联订单', key: 'order', render: (_, usage) => orderLink(usage.orderId) },
            { title: '损耗量', dataIndex: 'lossMg', render: formatWeight },
            { title: '确认状态', key: 'confirmation', render: (_, usage) => <StatusTag value={usage.lossConfirmed ? '已确认' : '待确认'} /> },
            { title: '操作', key: 'action', render: (_, usage) => <Button type="link" onClick={() => navigate('factory', usage.orderId)}>查看工厂依据</Button> },
          ]} /> },
        ]} />
      </div> : <Empty description="此批次不存在或已恢复演示数据" />}
    </Drawer>
    <Modal title="采购入库" open={batchOpen} onCancel={() => setBatchOpen(false)} footer={null} destroyOnHidden>
      <Form form={batchForm} layout="vertical" onFinish={saveBatch} disabled={busy}>
        <div className="form-grid"><Form.Item name="material" label="原料" rules={required}><Select options={['黄金', '白银'].map(value => ({ value, label: value }))} /></Form.Item><Form.Item name="purity" label="成色" rules={[{ required: true, whitespace: true, message: '请填写成色' }]}><Input placeholder="如 Au999" /></Form.Item></div>
        <Form.Item name="source" label="供应来源" rules={[{ required: true, whitespace: true, message: '请填写采购来源' }]}><Input placeholder="供应商名称 / 采购单号" /></Form.Item>
        <div className="form-grid"><Form.Item name="unitCost" label="采购单价（元 / g）" rules={required}><InputNumber min={0.01} precision={2} style={{ width: '100%' }} /></Form.Item><Form.Item name="quantity" label="入库量（g）" rules={required}><InputNumber min={0.001} precision={3} style={{ width: '100%' }} /></Form.Item></div>
        <Form.Item name="location" label="存放库位" rules={[{ required: true, whitespace: true, message: '请填写库位' }]}><Input /></Form.Item>
        <Button type="primary" htmlType="submit" loading={busy} block>确认入库</Button>
      </Form>
    </Modal>
    <Modal title={`盘点调整 · ${adjustId ?? ''}`} open={Boolean(adjustId)} onCancel={() => setAdjustId(undefined)} footer={null} destroyOnHidden>
      <Form form={adjustForm} layout="vertical" onFinish={adjustStock} disabled={busy}>
        <Alert type="info" showIcon title="填写库存差额" description="正数增加库存，负数减少库存；每次调整保留时间和原因。" style={{ marginBottom: 20 }} />
        <Form.Item name="quantity" label="调整差额（g）" rules={[...required, { validator: (_, value) => value === 0 ? Promise.reject(new Error('差额不能为零')) : Promise.resolve() }]}><InputNumber precision={3} style={{ width: '100%' }} placeholder="例如 -0.125 或 0.050" /></Form.Item>
        <Form.Item name="reason" label="盘点原因 / 凭据" rules={[{ required: true, whitespace: true, message: '请填写盘点依据' }]}><Input.TextArea rows={3} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={busy} block>保存盘点调整</Button>
      </Form>
    </Modal>
  </div>;
}

interface CampaignValues { name: string; channel: string; budget: number; status: Campaign['status'] }
interface LeadValues { name: string; phone: string; advisor: string }

export function MarketingPage({ navigate, focusId }: PageProps) {
  const { state, run, busy } = useCRM();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('全部');
  const [detailId, setDetailId] = useState<string>();
  const [editing, setEditing] = useState<{ id?: string }>();
  const [leadCampaignId, setLeadCampaignId] = useState<string>();
  const [campaignForm] = Form.useForm<CampaignValues>();
  const [leadForm] = Form.useForm<LeadValues>();
  useEffect(() => { if (focusId) setDetailId(focusId); }, [focusId]);
  const selected = state.campaigns.find(campaign => campaign.id === detailId);
  const campaignOrders = (campaign: Campaign) => state.orders.filter(order => campaign.customerIds.includes(order.customerId) && order.status !== '已取消');
  const campaignRevenue = (campaign: Campaign) => campaignOrders(campaign).reduce((sum, order) => sum + order.quoteCents, 0);
  const selectedCustomers = state.customers.filter(customer => selected?.customerIds.includes(customer.id));
  const selectedOrders = selected ? campaignOrders(selected) : [];
  const filtered = state.campaigns.filter(campaign => (status === '全部' || campaign.status === status) && [campaign.name, campaign.channel].some(value => value.toLowerCase().includes(query.trim().toLowerCase())));

  function editCampaign(campaign?: Campaign) {
    campaignForm.resetFields();
    campaignForm.setFieldsValue(campaign ? { name: campaign.name, channel: campaign.channel, budget: campaign.budgetCents / 100, status: campaign.status } : { channel: '门店', budget: 0, status: '草稿' });
    setEditing(campaign ? { id: campaign.id } : {});
  }
  function addLead(campaignId: string) {
    leadForm.resetFields();
    setLeadCampaignId(campaignId);
  }
  async function saveCampaign(values: CampaignValues) {
    if (!editing || busy) return;
    try {
      await run({ type: 'SAVE_CAMPAIGN', payload: { id: editing.id, name: values.name.trim(), channel: values.channel.trim(), budgetCents: toCents(values.budget), status: values.status } });
      setEditing(undefined);
      campaignForm.resetFields();
    } catch { /* 保留活动编辑内容。 */ }
  }
  async function saveLead(values: LeadValues) {
    if (!leadCampaignId || busy) return;
    try {
      await run({ type: 'ADD_CAMPAIGN_LEAD', payload: { campaignId: leadCampaignId, name: values.name.trim(), phone: values.phone.trim(), advisor: values.advisor.trim() } });
      setDetailId(leadCampaignId);
      setLeadCampaignId(undefined);
      leadForm.resetFields();
    } catch { /* 客户模块与活动共用同一线索，失败保留输入。 */ }
  }

  return <div className="page-stack">
    <PageHeader title="营销中心" description="活动关联客户及其订单，转化金额随业务记录更新。" action={<Button type="primary" icon={<PlusOutlined />} onClick={() => editCampaign()} disabled={busy}>新建活动</Button>} />
    <div className="metric-line"><span>进行中 <strong>{state.campaigns.filter(campaign => campaign.status === '进行中').length}</strong></span><span>活动预算 <strong>{formatMoney(state.campaigns.reduce((sum, campaign) => sum + campaign.budgetCents, 0))}</strong></span><span>关联客户 <strong>{new Set(state.campaigns.flatMap(campaign => campaign.customerIds)).size}</strong></span></div>
    <Panel title="活动列表">
      <div className="toolbar"><Input.Search aria-label="搜索营销活动" placeholder="活动名称 / 渠道" allowClear value={query} onChange={event => setQuery(event.target.value)} style={{ width: 280 }} /><Select aria-label="活动状态筛选" value={status} onChange={setStatus} options={['全部', '草稿', '进行中', '已结束'].map(value => ({ value, label: value }))} style={{ width: 140 }} /></div>
      <Table<Campaign> rowKey="id" dataSource={filtered} scroll={{ x: 900 }} pagination={{ pageSize: 8, showSizeChanger: false }} locale={{ emptyText: <Empty description={state.campaigns.length ? '未找到匹配活动' : '暂无活动，创建活动后登记新线索'} /> }} columns={[
        { title: '活动名称', dataIndex: 'name', width: 200, render: (name, campaign) => <Button type="link" onClick={() => setDetailId(campaign.id)}>{name}</Button> },
        { title: '渠道', dataIndex: 'channel', width: 110 },
        { title: '预算', dataIndex: 'budgetCents', width: 120, render: formatMoney },
        { title: '状态', dataIndex: 'status', width: 100, render: value => <StatusTag value={value} /> },
        { title: '关联客户', key: 'customers', width: 100, render: (_, campaign) => campaign.customerIds.length },
        { title: '有效订单 / 金额', key: 'conversion', width: 180, render: (_, campaign) => <><strong>{formatMoney(campaignRevenue(campaign))}</strong><div className="muted">{campaignOrders(campaign).length} 笔订单</div></> },
        { title: '操作', key: 'actions', width: 200, render: (_, campaign) => <Space className="table-links"><Button type="link" onClick={() => setDetailId(campaign.id)}>详情</Button><Button type="link" onClick={() => editCampaign(campaign)} disabled={busy}>编辑</Button><Button type="link" onClick={() => addLead(campaign.id)} disabled={busy}>新增线索</Button></Space> },
      ]} />
    </Panel>
    <Drawer title={selected?.name ?? '活动详情'} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} size={860} extra={selected && <Space><Button onClick={() => editCampaign(selected)} disabled={busy}>编辑活动</Button><Button type="primary" onClick={() => addLead(selected.id)} disabled={busy}>新增线索</Button></Space>}>
      {selected ? <div className="page-stack">
        <Descriptions column={{ xs: 1, sm: 2 }} items={[
          { key: 'channel', label: '渠道', children: selected.channel },
          { key: 'status', label: '状态', children: <StatusTag value={selected.status} /> },
          { key: 'budget', label: '活动预算', children: formatMoney(selected.budgetCents) },
          { key: 'amount', label: '有效订单金额', children: formatMoney(campaignRevenue(selected)) },
        ]} />
        <Alert type="info" title="订单金额口径" description="统计关联客户的非取消订单报价。金额不代表已收款，活动状态仅在本地演示。" showIcon />
        <Panel title={`关联客户 · ${selectedCustomers.length}`}><Table rowKey="id" dataSource={selectedCustomers} scroll={{ x: 500 }} pagination={false} locale={{ emptyText: '暂无关联客户，可从本活动新增线索' }} columns={[
          { title: '客户', dataIndex: 'name', render: (name, customer) => <Button type="link" onClick={() => navigate('customers', customer.id)}>{name}</Button> },
          { title: '手机', dataIndex: 'phone' },
          { title: '负责顾问', dataIndex: 'advisor' },
          { title: '阶段', dataIndex: 'stage', render: value => <StatusTag value={value} /> },
        ]} /></Panel>
        <Panel title={`转化订单 · ${selectedOrders.length}`}><Table<Order> rowKey="id" dataSource={selectedOrders} scroll={{ x: 550 }} pagination={false} locale={{ emptyText: '关联客户尚无有效订单' }} columns={[
          { title: '订单', dataIndex: 'number', render: (number, order) => <Button type="link" onClick={() => navigate('orders', order.id)}>{number}</Button> },
          { title: '客户', key: 'customer', render: (_, order) => state.customers.find(customer => customer.id === order.customerId)?.name ?? order.customerId },
          { title: '订单金额', dataIndex: 'quoteCents', render: formatMoney },
          { title: '订单状态', dataIndex: 'status', render: value => <StatusTag value={value} /> },
        ]} /></Panel>
      </div> : <Empty description="此活动不存在或已恢复演示数据" />}
    </Drawer>
    <Modal title={editing?.id ? '编辑活动' : '新建活动'} open={Boolean(editing)} onCancel={() => setEditing(undefined)} footer={null} destroyOnHidden>
      <Form form={campaignForm} layout="vertical" onFinish={saveCampaign} disabled={busy}>
        <Form.Item name="name" label="活动名称" rules={[{ required: true, whitespace: true, message: '请填写活动名称' }]}><Input /></Form.Item>
        <Form.Item name="channel" label="渠道" rules={[{ required: true, whitespace: true, message: '请填写渠道' }]}><Input placeholder="门店 / 小程序 / 社群" /></Form.Item>
        <div className="form-grid"><Form.Item name="budget" label="预算（元）" rules={required}><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item><Form.Item name="status" label="状态" rules={required}><Select options={['草稿', '进行中', '已结束'].map(value => ({ value, label: value }))} /></Form.Item></div>
        <Button type="primary" htmlType="submit" loading={busy} block>保存活动</Button>
      </Form>
    </Modal>
    <Modal title={`新增活动线索 · ${state.campaigns.find(campaign => campaign.id === leadCampaignId)?.name ?? ''}`} open={Boolean(leadCampaignId)} onCancel={() => setLeadCampaignId(undefined)} footer={null} destroyOnHidden>
      <Form form={leadForm} layout="vertical" onFinish={saveLead} disabled={busy}>
        <Form.Item name="name" label="客户姓名" rules={[{ required: true, whitespace: true, message: '请填写姓名' }]}><Input /></Form.Item>
        <Form.Item name="phone" label="手机号码" rules={[...required, { pattern: /^1[3-9]\d{9}$/, message: '请填写有效的 11 位手机号码' }]}><Input inputMode="tel" maxLength={11} /></Form.Item>
        <Form.Item name="advisor" label="负责顾问" rules={[{ required: true, whitespace: true, message: '请填写负责顾问' }]}><Input placeholder="顾问姓名" /></Form.Item>
        <Button type="primary" htmlType="submit" loading={busy} block>创建客户并关联活动</Button>
      </Form>
    </Modal>
  </div>;
}

interface ReceiptValues { orderId: string; kind: Receipt['kind']; amount: number; method: string; note: string }
interface ExpenseValues { orderId: string; type: '加工' | '返工' | '其他'; amount: number; reason: string }

export function FinancePage({ navigate, focusId }: PageProps) {
  const { state, run, busy } = useCRM();
  const [query, setQuery] = useState('');
  const [fundStatus, setFundStatus] = useState('全部');
  const [detailId, setDetailId] = useState<string>();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [receiptForm] = Form.useForm<ReceiptValues>();
  const [expenseForm] = Form.useForm<ExpenseValues>();
  useEffect(() => { if (focusId) setDetailId(focusId); }, [focusId]);
  const focusedReceipt = state.receipts.find(receipt => receipt.id === detailId);
  const selected = state.orders.find(order => order.id === (focusedReceipt?.orderId ?? detailId));
  const canVerify = ['财务', '经营负责人', '管理员'].includes(state.settings.role);
  const matchesOrder = (order: Order) => [order.number, state.customers.find(customer => customer.id === order.customerId)?.name ?? ''].some(value => value.toLowerCase().includes(query.trim().toLowerCase()));
  const filteredOrders = state.orders.filter(matchesOrder);
  const filteredReceipts = state.receipts.filter(receipt => {
    const order = state.orders.find(item => item.id === receipt.orderId);
    return order && matchesOrder(order) && (fundStatus === '全部' || receipt.verified === (fundStatus === '已核验'));
  });
  const received = state.receipts.filter(receipt => receipt.verified && receipt.kind === '收款').reduce((sum, receipt) => sum + receipt.amountCents, 0);
  const refunded = state.receipts.filter(receipt => receipt.verified && receipt.kind === '退款').reduce((sum, receipt) => sum + receipt.amountCents, 0);
  const pending = state.receipts.filter(receipt => !receipt.verified).reduce((sum, receipt) => sum + receipt.amountCents, 0);
  const due = state.orders.filter(order => order.status !== '已取消').reduce((sum, order) => sum + orderBalance(state, order.id).dueCents, 0);
  const orderOptions = state.orders.map(order => ({ value: order.id, label: `${order.number} · ${state.customers.find(customer => customer.id === order.customerId)?.name ?? '客户'}` }));

  function openReceipt(orderId?: string, kind: Receipt['kind'] = '收款') {
    receiptForm.resetFields();
    receiptForm.setFieldsValue({ orderId, kind, method: '银行转账' });
    setReceiptOpen(true);
  }
  function openExpense(orderId?: string) {
    expenseForm.resetFields();
    expenseForm.setFieldsValue({ orderId, type: '加工' });
    setExpenseOpen(true);
  }
  async function saveReceipt(values: ReceiptValues) {
    if (busy) return;
    try {
      await run({ type: 'ADD_RECEIPT', payload: { orderId: values.orderId, kind: values.kind, amountCents: toCents(values.amount), method: values.method.trim(), note: values.note.trim() } });
      setReceiptOpen(false);
      receiptForm.resetFields();
    } catch { /* 交易保存失败保留金额及依据。 */ }
  }
  async function saveExpense(values: ExpenseValues) {
    if (busy) return;
    try {
      await run({ type: 'ADD_EXPENSE', payload: { orderId: values.orderId, type: values.type, amountCents: toCents(values.amount), reason: values.reason.trim() } });
      setExpenseOpen(false);
      expenseForm.resetFields();
    } catch { /* 保留实际费用输入。 */ }
  }
  const verifyAction = (receipt: Receipt) => receipt.verified ? <StatusTag value="已核验" /> : canVerify
    ? <Button type="link" disabled={busy} onClick={() => void run({ type: 'VERIFY_RECEIPT', payload: { receiptId: receipt.id } }).catch(() => {})}>核验</Button>
    : <Typography.Text type="secondary">待财务核验</Typography.Text>;
  const receiptColumns = [
    { title: '流水 / 订单', key: 'receipt', width: 200, render: (_: unknown, receipt: Receipt) => <><span>{receipt.id}</span><div><Button type="link" onClick={() => navigate('orders', receipt.orderId)}>{state.orders.find(order => order.id === receipt.orderId)?.number ?? receipt.orderId}</Button></div></> },
    { title: '类型', dataIndex: 'kind', width: 90, render: (value: string) => <Tag color={value === '退款' ? 'volcano' : 'blue'}>{value}</Tag> },
    { title: '金额', dataIndex: 'amountCents', width: 130, render: formatMoney },
    { title: '方式', dataIndex: 'method', width: 130 },
    { title: '凭据 / 备注', dataIndex: 'note', width: 200, render: (value: string) => value || '—' },
    { title: '登记时间', dataIndex: 'at', width: 175, render: time },
    { title: '核验', key: 'verify', width: 130, render: (_: unknown, receipt: Receipt) => verifyAction(receipt) },
  ];

  return <div className="page-stack">
    <PageHeader title="财务管理" description="与销售共用同一笔收退款，核验后更新已收款及应收余额。" action={<Space wrap><Button onClick={() => openExpense()} disabled={busy}>登记实际费用</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openReceipt()} disabled={busy}>登记收款 / 退款</Button></Space>} />
    <div className="metric-line"><span>待收余额 <strong>{formatMoney(due)}</strong></span><span>已核验收款 <strong>{formatMoney(received)}</strong></span><span>已核验退款 <strong>{formatMoney(refunded)}</strong></span><span>未核验资金 <strong>{formatMoney(pending)}</strong></span></div>
    {!canVerify && <Alert type="info" title={`当前岗位：${state.settings.role}，可查看资金记录`} description="本地模拟核验由财务、经营负责人或管理员处理。" showIcon action={<Button onClick={() => void run({ type: 'UPDATE_SETTINGS', payload: { role: '财务' } }).catch(() => {})} disabled={busy}>切换财务岗位</Button>} />}
    <Panel title="订单与资金依据">
      <div className="toolbar"><Input.Search aria-label="搜索财务订单" placeholder="订单号 / 客户姓名" value={query} onChange={event => setQuery(event.target.value)} allowClear style={{ width: 300 }} /></div>
      <Tabs items={[
        { key: 'orders', label: '订单应收', children: <Table<Order> rowKey="id" dataSource={filteredOrders} scroll={{ x: 1150 }} pagination={{ pageSize: 8, showSizeChanger: false }} locale={{ emptyText: <Empty description={state.orders.length ? '未找到匹配订单' : '暂无订单'} /> }} columns={[
          { title: '订单 / 客户', key: 'identity', width: 190, render: (_, order) => <><Button type="link" onClick={() => setDetailId(order.id)}>{order.number}</Button><div className="muted">{state.customers.find(customer => customer.id === order.customerId)?.name ?? '客户'}</div></> },
          { title: '报价', dataIndex: 'quoteCents', width: 120, render: formatMoney },
          { title: '已收 / 退款', key: 'received', width: 160, render: (_, order) => { const balance = orderBalance(state, order.id); return <>{formatMoney(balance.receivedCents)}<div className="muted">退款 {formatMoney(balance.refundedCents)}</div></>; } },
          { title: '未核验净额', key: 'pending', width: 140, render: (_, order) => formatMoney(orderBalance(state, order.id).pendingCents) },
          { title: '待收余额', key: 'due', width: 130, render: (_, order) => order.status === '已取消' ? '—' : <strong>{formatMoney(orderBalance(state, order.id).dueCents)}</strong> },
          { title: '实际成本', key: 'cost', width: 130, render: (_, order) => formatMoney(orderCost(state, order.id)) },
          { title: '状态', dataIndex: 'status', width: 110, render: value => <StatusTag value={value} /> },
          { title: '操作', key: 'actions', width: 250, render: (_, order) => <Space className="table-links"><Button type="link" onClick={() => setDetailId(order.id)}>资金详情</Button><Button type="link" onClick={() => openReceipt(order.id)} disabled={busy}>收款</Button><Button type="link" onClick={() => openReceipt(order.id, '退款')} disabled={busy}>退款</Button></Space> },
        ]} /> },
        { key: 'receipts', label: '收退款流水', children: <><div className="toolbar"><Select aria-label="资金核验状态筛选" value={fundStatus} onChange={setFundStatus} options={['全部', '待核验', '已核验'].map(value => ({ value, label: value }))} style={{ width: 140 }} /><span className="muted">未核验资金为全部待核验收款与退款金额之和</span></div><Table<Receipt> rowKey="id" dataSource={[...filteredReceipts].reverse()} scroll={{ x: 1050 }} pagination={{ pageSize: 8, showSizeChanger: false }} columns={receiptColumns} locale={{ emptyText: '暂无匹配资金流水' }} /></> },
        { key: 'expenses', label: '实际费用', children: <Table rowKey="id" dataSource={[...state.expenses].filter(expense => { const order = state.orders.find(item => item.id === expense.orderId); return order && matchesOrder(order); }).reverse()} scroll={{ x: 720 }} pagination={{ pageSize: 8, showSizeChanger: false }} locale={{ emptyText: '暂无匹配实际费用' }} columns={[
          { title: '关联订单', key: 'order', width: 170, render: (_, expense) => <Button type="link" onClick={() => navigate('orders', expense.orderId)}>{state.orders.find(order => order.id === expense.orderId)?.number ?? expense.orderId}</Button> },
          { title: '费用类型', dataIndex: 'type', width: 110 },
          { title: '金额', dataIndex: 'amountCents', width: 130, render: formatMoney },
          { title: '理由 / 依据', dataIndex: 'reason', width: 220 },
          { title: '登记时间', dataIndex: 'at', width: 170, render: time },
        ]} /> },
      ]} />
    </Panel>
    <Drawer title={selected ? `资金详情 · ${selected.number}` : '资金详情'} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} size={900} extra={selected && <Button onClick={() => navigate('orders', selected.id)}>查看订单依据</Button>}>
      {selected ? <div className="page-stack">
        <Descriptions column={{ xs: 1, sm: 2 }} items={[
          { key: 'quote', label: '订单报价', children: formatMoney(selected.quoteCents) },
          { key: 'version', label: '报价版本', children: `V${selected.quoteVersion} · 设计 ${selected.designVersion}` },
          { key: 'received', label: '已核验收款', children: formatMoney(orderBalance(state, selected.id).receivedCents) },
          { key: 'refund', label: '已核验退款', children: formatMoney(orderBalance(state, selected.id).refundedCents) },
          { key: 'pending', label: '待核验净额', children: formatMoney(orderBalance(state, selected.id).pendingCents) },
          { key: 'due', label: '待收余额', children: selected.status === '已取消' ? '订单已取消' : formatMoney(orderBalance(state, selected.id).dueCents) },
        ]} />
        <Space wrap><Button type="primary" onClick={() => openReceipt(selected.id)} disabled={busy}>登记收款</Button><Button onClick={() => openReceipt(selected.id, '退款')} disabled={busy}>登记退款</Button><Button onClick={() => openExpense(selected.id)} disabled={busy}>登记实际费用</Button></Space>
        <Panel title="共享收退款流水"><Table<Receipt> rowKey="id" dataSource={state.receipts.filter(receipt => receipt.orderId === selected.id)} columns={receiptColumns} scroll={{ x: 1050 }} pagination={false} locale={{ emptyText: '尚无收退款记录' }} /></Panel>
        <Panel title="实际费用依据"><Table rowKey="id" dataSource={state.expenses.filter(expense => expense.orderId === selected.id)} pagination={false} locale={{ emptyText: '尚无实际费用' }} columns={[
          { title: '类型', dataIndex: 'type' }, { title: '金额', dataIndex: 'amountCents', render: formatMoney }, { title: '依据', dataIndex: 'reason' }, { title: '时间', dataIndex: 'at', render: time },
        ]} /></Panel>
      </div> : <Empty description="此订单不存在或已恢复演示数据" />}
    </Drawer>
    <Modal title="登记收款 / 退款" open={receiptOpen} onCancel={() => setReceiptOpen(false)} footer={null} destroyOnHidden>
      <Form form={receiptForm} layout="vertical" onFinish={saveReceipt} disabled={busy}>
        <Form.Item name="orderId" label="关联订单" rules={required}><Select showSearch optionFilterProp="label" options={orderOptions} placeholder="选择订单" /></Form.Item>
        <div className="form-grid"><Form.Item name="kind" label="交易类型" rules={required}><Select options={['收款', '退款'].map(value => ({ value, label: value }))} /></Form.Item><Form.Item name="amount" label="金额（元）" rules={required}><InputNumber min={0.01} precision={2} style={{ width: '100%' }} /></Form.Item></div>
        <Form.Item name="method" label="收退款方式" rules={[{ required: true, whitespace: true, message: '请填写资金方式' }]}><Input placeholder="银行转账 / 现金 / 小程序模拟" /></Form.Item>
        <Form.Item name="note" label="凭据 / 备注" rules={[{ required: true, whitespace: true, message: '请填写资金凭据或说明' }]}><Input.TextArea rows={3} /></Form.Item>
        <p className="muted">保存为待核验记录，由财务等模拟岗位核验后计入已收与退款。</p>
        <Button type="primary" htmlType="submit" loading={busy} block>登记资金流水</Button>
      </Form>
    </Modal>
    <Modal title="登记实际费用" open={expenseOpen} onCancel={() => setExpenseOpen(false)} footer={null} destroyOnHidden>
      <Form form={expenseForm} layout="vertical" onFinish={saveExpense} disabled={busy}>
        <Form.Item name="orderId" label="关联订单" rules={required}><Select showSearch optionFilterProp="label" options={orderOptions} placeholder="选择订单" /></Form.Item>
        <div className="form-grid"><Form.Item name="type" label="费用类型" rules={required}><Select options={['加工', '返工', '其他'].map(value => ({ value, label: value }))} /></Form.Item><Form.Item name="amount" label="金额（元）" rules={required}><InputNumber min={0.01} precision={2} style={{ width: '100%' }} /></Form.Item></div>
        <Form.Item name="reason" label="费用理由 / 依据" rules={[{ required: true, whitespace: true, message: '请填写费用理由' }]}><Input.TextArea rows={3} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={busy} block>保存实际费用</Button>
      </Form>
    </Modal>
  </div>;
}

interface SettingsValues { storeName: string; role: Role }

export function SystemPage({ navigate, focusId }: PageProps) {
  const { state, run, busy, storageError } = useCRM();
  const [activeTab, setActiveTab] = useState('roles');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pushOrderId, setPushOrderId] = useState<string>();
  const [logId, setLogId] = useState<string>();
  const [logQuery, setLogQuery] = useState('');
  const [logStatus, setLogStatus] = useState('全部');
  const [queryResult, setQueryResult] = useState<{ title: string; body: string }>();
  const [settingsForm] = Form.useForm<SettingsValues>();
  useEffect(() => { if (focusId) { setActiveTab('logs'); setLogId(focusId); } }, [focusId]);
  const log = state.apiLogs.find(item => item.id === logId);
  const importedOrders = state.orders.filter(order => order.externalId);
  const selectedPushOrder = importedOrders.find(order => order.id === pushOrderId);
  const importCount = state.externalOrders.filter(external => state.orders.some(order => order.externalId === external.externalId)).length;
  const filteredLogs = state.apiLogs.filter(item => [item.path, item.method, item.message].some(value => value.toLowerCase().includes(logQuery.trim().toLowerCase())) && (logStatus === '全部' || (item.status >= 200 && item.status < 300) === (logStatus === '成功')));

  function editSettings() {
    settingsForm.resetFields();
    settingsForm.setFieldsValue({ storeName: state.settings.storeName, role: state.settings.role });
    setSettingsOpen(true);
  }
  async function saveSettings(values: SettingsValues) {
    if (busy) return;
    try {
      await run({ type: 'UPDATE_SETTINGS', payload: { storeName: values.storeName.trim(), role: values.role } });
      setSettingsOpen(false);
    } catch { /* 保留门店与岗位编辑。 */ }
  }
  function preview(kind: 'products' | 'inventory') {
    const data = kind === 'products' ? state.products.map(product => ({ id: product.id, name: product.name, series: product.series, designVersion: product.designVersion, purity: product.purity, goldMg: product.goldMg, status: product.status })) : state.batches.map(batch => ({ ...batch, availableMg: batchAvailable(state, batch.id) }));
    setQueryResult({ title: kind === 'products' ? '模拟商品查询结果' : '模拟库存查询结果', body: JSON.stringify({ source: '当前浏览器业务数据', at: new Date().toISOString(), data }, null, 2) });
  }

  return <div className="page-stack">
    <PageHeader title="系统与集成" description="岗位资料、本地数据与小程序接口演示集中管理。" />
    {storageError && <Alert type="error" showIcon title="本地数据保存异常" description={`${storageError}。现有页面记录未被假装保存，可先导出当前数据，再尝试恢复演示数据。`} />}
    <Panel>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: 'roles', label: '岗位资料', children: <div className="page-stack">
          <Descriptions title="当前工作空间" column={{ xs: 1, sm: 2 }} extra={<Button onClick={editSettings} disabled={busy}>编辑资料</Button>} items={[
            { key: 'store', label: '门店名称', children: state.settings.storeName },
            { key: 'role', label: '当前岗位', children: <Tag color="gold">{state.settings.role}</Tag> },
            { key: 'environment', label: '环境', children: '概念演示 · 虚构业务 · 当前浏览器保存' },
            { key: 'verification', label: '资金核验岗位', children: '财务 / 经营负责人 / 管理员（模拟）' },
          ]} />
          <Alert type="info" showIcon title="岗位与权限为讨论设置" description="顶部岗位切换与此处共用资料。商家的真实负责人、兼岗和权限矩阵尚待确认。" />
          <div className="compact-list">{roles.map(role => <div key={role}><strong>{role}</strong><span className="muted">{role === state.settings.role ? '当前演示岗位' : '可从顶部岗位菜单切换'}</span></div>)}</div>
        </div> },
        { key: 'integration', label: '小程序接入', children: <div className="page-stack">
          <div className="toolbar"><Switch aria-label="小程序模拟连接" checked={state.settings.integrationEnabled} checkedChildren="已连接" unCheckedChildren="已关闭" loading={busy} disabled={busy} onChange={integrationEnabled => void run({ type: 'UPDATE_SETTINGS', payload: { integrationEnabled } }).catch(() => {})} /><span className="muted">仅模拟接口；使用当前浏览器的虚构订单</span></div>
          <Panel title="订单导入" extra={<Space wrap><Button onClick={() => void run({ type: 'SYNC_ORDERS', payload: { fail: true } }).catch(() => {})} disabled={busy || !state.settings.integrationEnabled}>模拟失败</Button><Button type="primary" icon={<ReloadOutlined />} onClick={() => void run({ type: 'SYNC_ORDERS', payload: {} }).catch(() => {})} disabled={busy || !state.settings.integrationEnabled} loading={busy}>同步订单</Button></Space>}>
            <p className="muted">已导入 {importCount} / {state.externalOrders.length} 笔，按外部订单号防重；失败可重新同步。</p>
            <Table rowKey="externalId" dataSource={state.externalOrders} scroll={{ x: 740 }} pagination={false} locale={{ emptyText: '暂无模拟外部订单' }} columns={[
              { title: '外部订单号', dataIndex: 'externalId', width: 170 },
              { title: '客户', dataIndex: 'customerName', width: 120 },
              { title: '商品', key: 'product', width: 170, render: (_, external) => state.products.find(product => product.id === external.productId)?.name ?? external.productId },
              { title: '金额', dataIndex: 'quoteCents', width: 120, render: formatMoney },
              { title: '导入状态', key: 'import', width: 180, render: (_, external) => { const order = state.orders.find(item => item.externalId === external.externalId); return order ? <><StatusTag value="已导入" /><Button type="link" onClick={() => navigate('orders', order.id)}>{order.number}</Button></> : <StatusTag value="待导入" />; } },
            ]} />
          </Panel>
          <Panel title="订单进度回传">
            <div className="toolbar"><Select aria-label="选择回传订单" placeholder="选择已导入订单" value={pushOrderId} onChange={setPushOrderId} showSearch optionFilterProp="label" allowClear style={{ width: 300 }} options={importedOrders.map(order => ({ value: order.id, label: `${order.number} · ${order.externalId}` }))} /><Button type="primary" disabled={busy || !state.settings.integrationEnabled || !selectedPushOrder} onClick={() => { if (pushOrderId) void run({ type: 'PUSH_PROGRESS', payload: { orderId: pushOrderId } }).catch(() => {}); }}>回传当前进度</Button></div>
            {selectedPushOrder ? <Space wrap><span>将回传：</span><StatusTag value={selectedPushOrder.status} /><StatusTag value={selectedPushOrder.production} /><StatusTag value={selectedPushOrder.delivery} /><Button type="link" onClick={() => navigate('orders', selectedPushOrder.id)}>查看订单</Button></Space> : <p className="muted">订单同步后可选择一笔订单，回传结果记录在请求日志。</p>}
          </Panel>
          <Panel title="商品与库存查询"><Space wrap><Button onClick={() => preview('products')}>查看商品 JSON</Button><Button onClick={() => preview('inventory')}>查看库存 JSON</Button></Space><p className="muted">即时预览同一业务数据，不发送网络请求。库存数量以毫克返回。</p></Panel>
        </div> },
        { key: 'logs', label: '请求日志', children: <><div className="toolbar"><Input.Search aria-label="搜索模拟请求日志" placeholder="路径 / 方法 / 结果" value={logQuery} onChange={event => setLogQuery(event.target.value)} allowClear style={{ width: 300 }} /><Select aria-label="请求状态筛选" value={logStatus} onChange={setLogStatus} options={['全部', '成功', '失败'].map(value => ({ value, label: value }))} style={{ width: 130 }} /></div><Table<ApiLog> rowKey="id" dataSource={[...filteredLogs].reverse()} scroll={{ x: 900 }} pagination={{ pageSize: 10, showSizeChanger: false }} locale={{ emptyText: <Empty description={state.apiLogs.length ? '未找到匹配请求，调整搜索或筛选后重试' : '暂无模拟请求，先在小程序接入页同步订单'} /> }} columns={[
          { title: '请求时间', dataIndex: 'at', width: 180, render: time },
          { title: '方法', dataIndex: 'method', width: 90 },
          { title: '路径', dataIndex: 'path', width: 230 },
          { title: '状态', dataIndex: 'status', width: 100, render: value => <Tag color={value >= 200 && value < 300 ? 'green' : 'volcano'}>{value}</Tag> },
          { title: '结果', dataIndex: 'message', width: 280 },
          { title: '操作', key: 'detail', width: 90, render: (_, item) => <Button type="link" onClick={() => setLogId(item.id)}>详情</Button> },
        ]} /></> },
        { key: 'data', label: '数据', children: <div className="page-stack">
          <Descriptions title="浏览器数据" column={{ xs: 1, sm: 2 }} items={[
            { key: 'customers', label: '客户', children: state.customers.length },
            { key: 'orders', label: '订单', children: state.orders.length },
            { key: 'batches', label: '库存批次', children: state.batches.length },
            { key: 'receipts', label: '收退款流水', children: state.receipts.length },
            { key: 'version', label: '数据格式', children: `V${state.version}` },
            { key: 'audits', label: '操作日志', children: state.audits.length },
          ]} />
          <Space wrap><Button icon={<DownloadOutlined />} onClick={() => downloadFile(`黄金CRM-演示数据-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2))}>导出当前数据</Button><Popconfirm title="恢复初始演示数据？" description="当前浏览器的操作记录将被初始虚构业务替换。建议先导出当前数据。" okText="恢复演示数据" cancelText="保留当前记录" onConfirm={async () => { await run({ type: 'RESET' }); setPushOrderId(undefined); setLogId(undefined); }}><Button danger disabled={busy}>恢复演示数据</Button></Popconfirm></Space>
          <Alert type="info" showIcon title="仅恢复本地演示" description="初始数据均为虚构内容。导出文件包含当前客户、订单及操作记录；本页面不连接真实支付或小程序后台。" />
          <Panel title="操作记录"><Table rowKey="id" dataSource={[...state.audits].reverse()} scroll={{ x: 760 }} pagination={{ pageSize: 8, showSizeChanger: false }} locale={{ emptyText: '暂无操作记录' }} columns={[
            { title: '时间', dataIndex: 'at', width: 175, render: time }, { title: '岗位', dataIndex: 'actor', width: 130 }, { title: '操作', dataIndex: 'action', width: 160 }, { title: '结果', dataIndex: 'summary', width: 320 },
          ]} /></Panel>
        </div> },
      ]} />
    </Panel>
    <Modal title="编辑门店与岗位资料" open={settingsOpen} onCancel={() => setSettingsOpen(false)} footer={null} destroyOnHidden>
      <Form form={settingsForm} layout="vertical" onFinish={saveSettings} disabled={busy}>
        <Form.Item name="storeName" label="门店名称" rules={[{ required: true, whitespace: true, message: '请填写门店名称' }]}><Input /></Form.Item>
        <Form.Item name="role" label="当前演示岗位" rules={required}><Select options={roles.map(role => ({ value: role, label: role }))} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={busy} block>保存资料</Button>
      </Form>
    </Modal>
    <Drawer title="模拟请求详情" open={Boolean(logId)} onClose={() => setLogId(undefined)} size={620}>
      {log ? <Descriptions column={1} items={[
        { key: 'id', label: '日志编号', children: log.id }, { key: 'at', label: '时间', children: time(log.at) }, { key: 'method', label: '方法', children: log.method }, { key: 'path', label: '路径', children: log.path }, { key: 'status', label: '状态码', children: log.status }, { key: 'message', label: '结果', children: log.message },
      ]} /> : <Empty description="此请求日志不存在或已恢复演示数据" />}
    </Drawer>
    <Drawer title={queryResult?.title} open={Boolean(queryResult)} onClose={() => setQueryResult(undefined)} size={740}>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13 }}>{queryResult?.body}</pre>
    </Drawer>
  </div>;
}
