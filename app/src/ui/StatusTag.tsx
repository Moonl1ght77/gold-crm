import type { ReactNode } from 'react';

/** 状态色：两套主题各自校准，见 tokens.css */
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';

export function StatusTag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`tag tone-${tone}`}>{children}</span>;
}
