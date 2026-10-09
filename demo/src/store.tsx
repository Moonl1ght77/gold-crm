import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { App } from 'antd';
import type { CRMState, Command } from './types.ts';
import { commitLocalState, createSeed, loadLocalState } from './domain.ts';

interface CRMContextValue { state:CRMState; run:(command:Command)=>Promise<void>; busy:boolean; storageError:string|null }
const CRMContext=createContext<CRMContextValue|null>(null);
function initialize() {
  try {return loadLocalState(window.localStorage);}
  catch(error) {return {state:createSeed(),storageError:`本地存储不可用：${error instanceof Error ? error.message : String(error)}。当前显示初始演示，请恢复存储权限后重置。`,blocked:true};}
}

export function CRMProvider({children}:{children:ReactNode}) {
  const {message}=App.useApp();
  const [initial]=useState(initialize);
  const [state,setState]=useState(initial.state);
  const [busy,setBusy]=useState(false);
  const [storageError,setStorageError]=useState<string|null>(initial.storageError);
  const stateRef=useRef(state);
  const blockedRef=useRef(initial.blocked);
  const queueRef=useRef<Promise<void>>(Promise.resolve());
  const run=useCallback((command:Command):Promise<void> => {
    const execute=async () => {
      const tick=command.type==='MARKET_TICK';
      if(tick && blockedRef.current) return;
      if(!tick) setBusy(true);
      try {
        if(!tick) await new Promise(resolve=>setTimeout(resolve,200));
        const previous=stateRef.current;
        const candidate=commitLocalState(window.localStorage,previous,command,blockedRef.current);
        stateRef.current=candidate;setState(candidate);blockedRef.current=false;setStorageError(null);
        if(command.type==='SYNC_ORDERS' || command.type==='PUSH_PROGRESS') {
          const log=candidate.apiLogs.at(-1);
          if(log && log.status!==200) throw new Error(log.message);
        }
        if(!tick) message.success(command.type==='RESET' ? '已恢复初始演示数据' : candidate.audits.at(-1)?.summary ?? '已保存');
      } catch(error) {
        const failure=error instanceof Error ? error : new Error(String(error));
        if(failure.name==='StorageSaveError') setStorageError(failure.message);
        if(!tick) message.error(failure.message);
        throw failure;
      } finally {if(!tick) setBusy(false);}
    };
    const pending=queueRef.current.then(execute);
    queueRef.current=pending.catch(()=>undefined);
    return pending;
  },[message]);
  return <CRMContext.Provider value={{state,run,busy,storageError}}>{children}</CRMContext.Provider>;
}

export function useCRM(): CRMContextValue {
  const context=useContext(CRMContext);
  if(!context) throw new Error('useCRM须在CRMProvider内使用');
  return context;
}
