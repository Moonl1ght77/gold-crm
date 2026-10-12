import { createContext, useContext } from 'react';
import type { AppRole } from '../roles.ts';
import type { ViewMode } from './prefs.ts';

export interface Shell {
  role: AppRole;
  view: ViewMode;
}

export const ShellContext = createContext<Shell | null>(null);

export function useShell(): Shell {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error('useShell 必须在 ShellContext 里使用');
  return shell;
}
