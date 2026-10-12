import { checkLinks } from './checks/links.ts';
import { checkPrefs } from './checks/prefs.ts';
import { checkRoles } from './checks/roles.ts';
import { checkRoutes } from './checks/routes.ts';
import type { Check } from './checks/types.ts';

const sections: Array<[string, (check: Check) => void]> = [
  ['路由', checkRoutes],
  ['岗位', checkRoles],
  ['偏好', checkPrefs],
  ['链接', checkLinks],
];

const failures: string[] = [];
for (const [, run] of sections) {
  run((ok, message) => {
    if (!ok) failures.push(message);
  });
}

if (failures.length > 0) {
  console.error(`检查未通过（${failures.length} 项）：\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`检查通过：${sections.map(([name]) => name).join('、')}。`);
