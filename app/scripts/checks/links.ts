import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Check } from './types.ts';

/**
 * 设计稿第 10 节第 6 条：内部链接要对得上路由表。规则是不手写 "#/..."，一律用 href()／detailHref()，路径写错时编译就报错。
 * routes.ts 是唯一生成链接的地方，不在扫描范围内。
 */
export function checkLinks(check: Check): void {
  const root = fileURLToPath(new URL('../../src', import.meta.url));
  const routesFile = join(root, 'routes.ts');
  const offenders: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name) && full !== routesFile && /["'`]#\//.test(readFileSync(full, 'utf8'))) offenders.push(full);
    }
  };
  walk(root);
  check(offenders.length === 0, `这些文件手写了 "#/..." 链接，应改用 href()／detailHref()：${offenders.join('，')}`);
}
