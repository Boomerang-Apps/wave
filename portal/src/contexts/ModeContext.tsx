/**
 * ModeContext - Dual Mode State Management
 *
 * Manages Simple (non-dev) vs Advanced (developer) mode across the portal.
 * Persists preference to localStorage.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type PortalMode = 'simple' | 'advanced';

interface ModeContextType {
  mode: PortalMode;
  setMode: (mode: PortalMode) => void;
  toggleMode: () => void;
  isSimple: boolean;
  isAdvanced: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const STORAGE_KEY = 'wave_portal_mode';

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PortalMode>(() => {
    // Load from localStorage or default to 'simple' for new users
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'simple' || saved === 'advanced') {
        return saved;
      }
    }
    return 'simple'; // Default to simple for new users
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = (newMode: PortalMode) => {
    setModeState(newMode);
  };

  const toggleMode = () => {
    setModeState(prev => prev === 'simple' ? 'advanced' : 'simple');
  };

  const value: ModeContextType = {
    mode,
    setMode,
    toggleMode,
    isSimple: mode === 'simple',
    isAdvanced: mode === 'advanced',
  };

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}

export default ModeContext;
