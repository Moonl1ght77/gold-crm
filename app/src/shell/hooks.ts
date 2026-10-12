import { useEffect, useMemo, useState } from 'react';
import { matchRoute } from '../routes.ts';
import type { RouteMatch } from '../routes.ts';

/** hash 路由：监听地址栏变化，返回匹配到的页面；匹配不到返回 null。 */
export function useHashRoute(): RouteMatch | null {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  return useMemo(() => matchRoute(hash), [hash]);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);
    sync();
    list.addEventListener('change', sync);
    return () => list.removeEventListener('change', sync);
  }, [query]);
  return matches;
}
