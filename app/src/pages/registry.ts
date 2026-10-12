import type { ComponentType } from 'react';
import { activeNavRoute } from '../routes.ts';
import type { AppRoute, RouteMatch, RoutePath } from '../routes.ts';
import type { ViewMode } from '../shell/prefs.ts';
import { BatchDetail } from './inventory/BatchDetail.tsx';
import { BatchList } from './inventory/BatchList.tsx';

export interface PageProps {
  params: Record<string, string>;
}

/**
 * 路径 → 页面组件。还没实现的页面不登记，Screen 显示占位页。
 * 第 7 批收尾时改成 Record<RoutePath, …>，漏登记就编译失败。
 */
export const pages: Partial<Record<RoutePath, ComponentType<PageProps>>> = {
  '/inventory/batches': BatchList,
  '/inventory/batches/:id': BatchDetail,
};

/** 桌面视图下，详情页叠在所属列表页上、用右侧抽屉显示；所属列表页还没做时照常整页显示。 */
export function drawerParent(match: RouteMatch, view: ViewMode): AppRoute | undefined {
  if (view !== 'desktop' || !match.route.path.includes(':')) return undefined;
  const parent = activeNavRoute(match);
  return parent && pages[parent.path] ? parent : undefined;
}
