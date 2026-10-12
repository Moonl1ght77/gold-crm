import { useEffect, useState } from 'react';
import { href } from './routes.ts';
import { roleById, roles } from './roles.ts';
import { ControlBar } from './shell/ControlBar.tsx';
import { DesktopFrame } from './shell/DesktopFrame.tsx';
import { useHashRoute, useMediaQuery } from './shell/hooks.ts';
import { NotesPanel } from './shell/NotesPanel.tsx';
import { PhoneFrame } from './shell/PhoneFrame.tsx';
import { loadPrefs, savePrefs } from './shell/prefs.ts';
import type { Prefs } from './shell/prefs.ts';
import { Screen } from './shell/Screen.tsx';
import { ShellContext } from './shell/ShellContext.ts';

export function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  // 窄屏默认收起说明，免得浮层一打开就挡住手机框
  const [notesOpen, setNotesOpen] = useState(() => window.matchMedia('(min-width: 821px)').matches);
  const match = useHashRoute();
  const wide = useMediaQuery('(min-width: 1024px)');
  const role = roleById(prefs.roleId) ?? roles[0];
  const view = wide ? prefs.view : 'phone';

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    savePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    if (!match) window.location.replace(href('/workbench'));
  }, [match]);

  if (!match) return null;

  const update = (patch: Partial<Prefs>) => setPrefs(current => ({ ...current, ...patch }));
  const screen = <Screen match={match} />;

  return (
    <ShellContext.Provider value={{ role, view }}>
      <ControlBar prefs={prefs} wide={wide} notesOpen={notesOpen} match={match} onChange={update} onNotes={setNotesOpen} />
      <div className={`stage stage-${view}`}>
        {view === 'phone' ? <PhoneFrame match={match}>{screen}</PhoneFrame> : <DesktopFrame match={match}>{screen}</DesktopFrame>}
        {notesOpen && <NotesPanel match={match} onClose={() => setNotesOpen(false)} />}
      </div>
    </ShellContext.Provider>
  );
}
