import type { ComponentType } from 'react';
import type { RoutePath } from '../routes.ts';

export interface PageProps {
  params: Record<string, string>;
}

/**
 * 路径 → 页面组件。还没实现的页面不登记，Screen 显示占位页。
 * 第 7 批收尾时改成 Record<RoutePath, …>，漏登记就编译失败。
 */
export const pages: Partial<Record<RoutePath, ComponentType<PageProps>>> = {};
