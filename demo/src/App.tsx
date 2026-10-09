import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Badge, Button, Drawer, Select, Tooltip } from 'antd';
import { ApartmentOutlined, BarChartOutlined, CheckCircleOutlined, CommentOutlined, CustomerServiceOutlined, DashboardOutlined, DollarOutlined, GoldOutlined, InboxOutlined, MenuOutlined, NodeIndexOutlined, RiseOutlined, ShopOutlined, TeamOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useCRM } from './store';
import { CustomerPage, OrdersPage, ProductsPage, FactoryPage, AftercarePage } from './BusinessPages';
import { InventoryPage, MarketingPage, FinancePage, SystemPage } from './OperationsPages';
import { HomePage, AnalyticsPage, MarketPage, Assistant } from './InsightPages';
import type { PageKey, Role } from './types';

const groups:Array<{label:string;items:{key:PageKey;label:string;icon:typeof DashboardOutlined}[]}> = [
  {label:'日常协作',items:[{key:'home',label:'工作台',icon:DashboardOutlined},{key:'customers',label:'客户与跟进',icon:TeamOutlined},{key:'orders',label:'销售与订单',icon:ShopOutlined},{key:'aftercare',label:'售后与服务',icon:CustomerServiceOutlined}]},
  {label:'产品与供应链',items:[{key:'products',label:'商品与设计',icon:GoldOutlined},{key:'inventory',label:'采购与库存',icon:InboxOutlined},{key:'factory',label:'工厂与质检',icon:ApartmentOutlined}]},
  {label:'经营管理',items:[{key:'marketing',label:'营销中心',icon:ThunderboltOutlined},{key:'finance',label:'财务管理',icon:DollarOutlined},{key:'analytics',label:'数据统计',icon:BarChartOutlined}]},
  {label:'行情与系统',items:[{key:'market',label:'行情中心',icon:RiseOutlined},{key:'system',label:'系统与集成',icon:NodeIndexOutlined}]}
];
const roles:Role[]=['经营负责人','门店顾问','品牌运营','产品设计','采购仓库','工厂质检','财务','管理员'];
const entries=groups.flatMap(g=>g.items);
function readRoute(){const [page,search]=location.hash.slice(1).split('?'); return {page:(entries.some(e=>e.key===page)?page:'home') as PageKey,focusId:new URLSearchParams(search).get('record')||undefined};}

export function CRMApp(){
  const {state,run,busy,storageError}=useCRM();
  const [route,setRoute]=useState(readRoute);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [assistantOpen,setAssistantOpen]=useState(false);
  useEffect(()=>{const onHash=()=>{setRoute(readRoute());setMobileOpen(false);}; window.addEventListener('hashchange',onHash); return ()=>window.removeEventListener('hashchange',onHash);},[]);
  useEffect(()=>{if(!state.settings.marketRunning)return; const timer=setInterval(()=>{void run({type:'MARKET_TICK'}).catch(()=>{});},5000);return ()=>clearInterval(timer);},[state.settings.marketRunning,run]);
  function navigate(page:PageKey,entityId?:string){location.hash=page+(entityId?'?record='+encodeURIComponent(entityId):''); if(location.hash.slice(1)===page)setRoute(readRoute());}
  const active=entries.find(e=>e.key===route.page)!;
  const group=groups.find(g=>g.items.some(i=>i.key===route.page))!;
  const taskCount=state.todos.filter(t=>!t.done && (state.settings.role==='经营负责人'||t.owner===state.settings.role)).length;
  const sidebar=<><div className="brand"><div className="brand-mark"><GoldOutlined/></div><div><strong>黄金CRM</strong><span>公司协作工作台</span></div></div><nav aria-label="一级导航">{groups.map(g=><div className="nav-group" key={g.label}><div className="nav-label">{g.label}</div>{g.items.map(item=><button key={item.key} className={`nav-item ${route.page===item.key?'active':''}`} aria-current={route.page===item.key?'page':undefined} onClick={()=>navigate(item.key)}><item.icon/><span>{item.label}</span>{item.key==='home'&&taskCount>0&&<span className="nav-count">{taskCount}</span>}</button>)}</div>)}</nav><div className="sidebar-foot"><Badge status={state.settings.integrationEnabled?'success':'default'}/><span>小程序模拟连接{state.settings.integrationEnabled?'已开启':'已关闭'}</span><button onClick={()=>navigate('system')} aria-label="管理小程序连接">管理</button></div></>;
  const props={navigate,focusId:route.focusId};
  const pages:Record<PageKey,ReactNode>={home:<HomePage {...props}/>,customers:<CustomerPage {...props}/>,orders:<OrdersPage {...props}/>,aftercare:<AftercarePage {...props}/>,products:<ProductsPage {...props}/>,inventory:<InventoryPage {...props}/>,factory:<FactoryPage {...props}/>,marketing:<MarketingPage {...props}/>,finance:<FinancePage {...props}/>,analytics:<AnalyticsPage {...props}/>,market:<MarketPage {...props}/>,system:<SystemPage {...props}/>};
  return <div className="app-shell"><aside className="sidebar">{sidebar}</aside><Drawer title="黄金CRM" placement="left" open={mobileOpen} onClose={()=>setMobileOpen(false)} size={260} styles={{body:{padding:0}}}><div className="mobile-sidebar">{sidebar}</div></Drawer><div className="workspace"><header className="topbar"><div className="topbar-location"><Button className="mobile-menu" type="text" icon={<MenuOutlined/>} aria-label="打开导航" onClick={()=>setMobileOpen(true)}/><span>{group.label}</span><span className="breadcrumb-slash">/</span><strong>{active.label}</strong><span className="environment">概念演示</span></div><div className="topbar-tools"><Tooltip title="切换岗位查看对应待办；权限为概念演示"><Select aria-label="当前岗位" value={state.settings.role} options={roles.map(r=>({value:r,label:r}))} onChange={role=>void run({type:'UPDATE_SETTINGS',payload:{role}}).catch(()=>{})} disabled={busy} style={{width:140}}/></Tooltip><Button icon={<CommentOutlined/>} onClick={()=>setAssistantOpen(true)}>AI 助理</Button></div></header>{storageError&&<div className="storage-alert"><Alert type="error" showIcon title="本地保存异常" description={storageError} action={<Button onClick={()=>navigate('system')}>恢复演示数据</Button>}/></div>}<main className="main-content" key={route.page}>{pages[route.page]}</main><footer className="workspace-foot"><span><CheckCircleOutlined/> 虚拟业务 · 操作保存在当前浏览器</span><span>{state.settings.storeName}</span></footer></div><Assistant open={assistantOpen} close={()=>setAssistantOpen(false)} navigate={navigate}/></div>;
}
