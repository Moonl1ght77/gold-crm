import { href } from '../routes.ts';
import type { RouteMatch } from '../routes.ts';
import { roleGroups, roles } from '../roles.ts';
import type { Prefs } from './prefs.ts';

const forms = [
  { label: '工作台', to: href('/workbench') },
  { label: '侧边栏', to: href('/wecom/sidebar') },
  { label: '消息', to: href('/wecom/messages') },
  { label: '客户联系', to: href('/wecom/contacts') },
];

interface Props {
  prefs: Prefs;
  wide: boolean;
  notesOpen: boolean;
  match: RouteMatch;
  onChange: (patch: Partial<Prefs>) => void;
  onNotes: (open: boolean) => void;
}

/** 演示控制栏：演示工具，不属于企微界面。 */
export function ControlBar({ prefs, wide, notesOpen, match, onChange, onNotes }: Props) {
  const here = '#' + match.route.path;
  const currentForm = forms.find(f => f.to === here)?.to ?? forms[0].to;
  const phone = !wide || prefs.view === 'phone';
  return (
    <header className="control-bar">
      <strong className="control-title">演示控制栏</strong>
      <label className="control">
        <span className="control-label">身份</span>
        <select value={prefs.roleId} onChange={e => onChange({ roleId: e.target.value as Prefs['roleId'] })}>
          {roleGroups.map(group => (
            <optgroup key={group} label={group}>
              {roles
                .filter(r => r.group === group)
                .map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="control" role="group" aria-label="视图">
        <span className="control-label">视图</span>
        <button type="button" aria-pressed={phone} onClick={() => onChange({ view: 'phone' })}>
          手机
        </button>
        <button
          type="button"
          aria-pressed={!phone}
          disabled={!wide}
          title={wide ? undefined : '窗口窄于 1024px 时只能用手机视图'}
          onClick={() => onChange({ view: 'desktop' })}
        >
          桌面
        </button>
      </div>
      <nav className="control" aria-label="形态">
        <span className="control-label">形态</span>
        {forms.map(f => (
          <a key={f.to} href={f.to} aria-current={f.to === currentForm ? 'page' : undefined}>
            {f.label}
          </a>
        ))}
      </nav>
      <div className="control" role="group" aria-label="主题">
        <span className="control-label">主题</span>
        <button type="button" aria-pressed={prefs.theme === 'dark'} onClick={() => onChange({ theme: 'dark' })}>
          深
        </button>
        <button type="button" aria-pressed={prefs.theme === 'light'} onClick={() => onChange({ theme: 'light' })}>
          浅
        </button>
      </div>
      <div className="control" role="group" aria-label="页面说明">
        <span className="control-label">页面说明</span>
        <button type="button" aria-pressed={notesOpen} onClick={() => onNotes(true)}>
          开
        </button>
        <button type="button" aria-pressed={!notesOpen} onClick={() => onNotes(false)}>
          关
        </button>
      </div>
    </header>
  );
}
