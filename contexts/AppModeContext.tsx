'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppMode, getAppMode, setAppMode, isDemoMode } from '@/lib/appMode';
import { demoRepository } from '@/lib/demoRepository';

interface AppModeContextType {
  mode: AppMode;
  isDemo: boolean;
  setMode: (mode: AppMode) => void;
  resetDemoData: () => void;
}

const AppModeContext = createContext<AppModeContextType>({
  mode: 'PRODUCTION',
  isDemo: false,
  setMode: () => {},
  resetDemoData: () => {}
});

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode>('PRODUCTION');

  useEffect(() => {
    // Initial sync
    setModeState(getAppMode());

    const handleModeChange = () => {
      setModeState(getAppMode());
    };

    window.addEventListener('app_mode_changed', handleModeChange);
    window.addEventListener('storage', handleModeChange);

    return () => {
      window.removeEventListener('app_mode_changed', handleModeChange);
      window.removeEventListener('storage', handleModeChange);
    };
  }, []);

  const handleSetMode = (newMode: AppMode) => {
    setAppMode(newMode);
    setModeState(newMode);
  };

  const handleResetDemoData = () => {
    demoRepository.resetToDefault();
    window.dispatchEvent(new CustomEvent('app_mode_changed', { detail: { mode: 'DEMO' } }));
    // Force a light reload if needed to reset all states cleanly
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <AppModeContext.Provider
      value={{
        mode,
        isDemo: mode === 'DEMO',
        setMode: handleSetMode,
        resetDemoData: handleResetDemoData
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => useContext(AppModeContext);
