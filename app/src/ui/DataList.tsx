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
