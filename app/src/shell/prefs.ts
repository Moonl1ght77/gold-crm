import { DEFAULT_ROLE_ID, roleById } from '../roles.ts';
import type { RoleId } from '../roles.ts';

export type ViewMode = 'phone' | 'desktop';
export type Theme = 'dark' | 'light';

/** 设计稿第 3 节：身份、视图、主题存在本机浏览器 */
export interface Prefs {
  roleId: RoleId;
  view: ViewMode;
  theme: Theme;
}

export const DEFAULT_PREFS: Prefs = { roleId: DEFAULT_ROLE_ID, view: 'phone', theme: 'dark' };

const KEY = 'gold-crm-prototype:prefs';

/** 逐项校验；坏数据、旧版本或未知值都退回默认，不让存储里的旧值卡住页面。 */
export function parsePrefs(raw: string | null): Prefs {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
  } catch {
    // 存储内容损坏，按默认处理
  }
  const role = typeof data.roleId === 'string' ? roleById(data.roleId) : undefined;
  return {
    roleId: role ? role.id : DEFAULT_PREFS.roleId,
    view: data.view === 'phone' || data.view === 'desktop' ? data.view : DEFAULT_PREFS.view,
    theme: data.theme === 'dark' || data.theme === 'light' ? data.theme : DEFAULT_PREFS.theme,
  };
}

export function loadPrefs(): Prefs {
  try {
    return parsePrefs(window.localStorage.getItem(KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // 隐私模式等写不进去时，只在本次打开期间生效
  }
}
