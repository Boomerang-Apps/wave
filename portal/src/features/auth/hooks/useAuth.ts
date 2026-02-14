import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { IAuthContextType } from '../context/AuthContext';

export function useAuth(): IAuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
