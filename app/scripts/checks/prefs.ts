import { DEFAULT_PREFS, parsePrefs } from '../../src/shell/prefs.ts';
import type { Check } from './types.ts';

export function checkPrefs(check: Check): void {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  check(same(parsePrefs(null), DEFAULT_PREFS), '存储为空时应退回默认偏好');
  check(same(parsePrefs('{坏数据'), DEFAULT_PREFS), '存储内容损坏时应退回默认偏好');
  check(same(parsePrefs('"字符串"'), DEFAULT_PREFS), '存储内容不是对象时应退回默认偏好');
  check(
    same(parsePrefs(JSON.stringify({ roleId: 'advisor', view: 'desktop', theme: 'light' })), { roleId: 'advisor', view: 'desktop', theme: 'light' }),
    '有效偏好应原样读回',
  );
  check(same(parsePrefs(JSON.stringify({ roleId: 'ghost', view: 'tv', theme: 'pink' })), DEFAULT_PREFS), '无效字段应逐项退回默认');
  check(same(parsePrefs(JSON.stringify({ roleId: 'qc' })), { ...DEFAULT_PREFS, roleId: 'qc' }), '缺少的字段应补默认值');
}
