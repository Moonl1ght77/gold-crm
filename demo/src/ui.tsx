import { Tag } from 'antd';
import type { ReactNode } from 'react';

export function PageHeader({title,description,action}:{title:string;description?:string;action?:ReactNode}) {
  return <header className="page-head"><div><h1>{title}</h1>{description && <p>{description}</p>}</div><div className="page-action">{action}</div></header>;
}
export function Panel({title,extra,children,className=''}:{title?:ReactNode;extra?:ReactNode;children:ReactNode;className?:string}) {
  return <section className={`panel ${className}`}>{(title || extra) && <div className="panel-head"><h2>{title}</h2>{extra}</div>}<div className="panel-body">{children}</div></section>;
}
export function StatusTag({value}:{value:string}) {
  const color = /已合格|已确认|已交付|已成交|已核验|已关闭|进行中|成功/.test(value)?'green':/取消|返工|失败|待查/.test(value)?'volcano':/待|草稿|未|处理中|制作中/.test(value)?'gold':'blue';
  return <Tag color={color}>{value}</Tag>;
}
export function downloadFile(name:string,body:string,type='application/json;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([body],{type})); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
