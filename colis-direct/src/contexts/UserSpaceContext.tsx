import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  clearStoredActiveSpace,
  readStoredActiveSpace,
  type ClientProSpace,
  userHasDualClientProAccess,
  writeStoredActiveSpace,
} from '../utils/userSpace';

type UserSpaceContextValue = {
  activeSpace: ClientProSpace;
  setActiveSpace: (space: ClientProSpace) => void;
  dualClientProAccess: boolean;
};

const UserSpaceContext = createContext<UserSpaceContextValue | undefined>(undefined);

export function UserSpaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeSpace, setActiveSpaceState] = useState<ClientProSpace>('client');

  useEffect(() => {
    if (!user) {
      clearStoredActiveSpace();
      setActiveSpaceState('client');
      return;
    }
    if (userHasDualClientProAccess(user)) {
      const stored = readStoredActiveSpace();
      const next = stored ?? 'client';
      setActiveSpaceState(next);
      if (stored == null) {
        writeStoredActiveSpace(next);
      }
    } else {
      clearStoredActiveSpace();
      setActiveSpaceState('client');
    }
  }, [user]);

  const setActiveSpace = useCallback((space: ClientProSpace) => {
    writeStoredActiveSpace(space);
    setActiveSpaceState(space);
  }, []);

  const dualClientProAccess = user != null && userHasDualClientProAccess(user);

  const value = useMemo(
    () => ({ activeSpace, setActiveSpace, dualClientProAccess }),
    [activeSpace, setActiveSpace, dualClientProAccess],
  );

  return <UserSpaceContext.Provider value={value}>{children}</UserSpaceContext.Provider>;
}

export function useUserSpace() {
  const ctx = useContext(UserSpaceContext);
  if (!ctx) {
    throw new Error('useUserSpace must be used within UserSpaceProvider');
  }
  return ctx;
}

export { userHasDualClientProAccess } from '../utils/userSpace';
