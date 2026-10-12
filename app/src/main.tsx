import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { loadPrefs } from './shell/prefs.ts';
import './styles/tokens.css';
import './styles/shell.css';

// 首帧前先套上保存的主题，避免浅色用户看到一闪深色
document.documentElement.dataset.theme = loadPrefs().theme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
