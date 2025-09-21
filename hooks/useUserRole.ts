'use client';

import { useMemo } from 'react';

export const useUserRole = () => {
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  const roleChecks = useMemo(() => {
    const role = user?.role;

    return {
      user,
      role,
      isSuperAdmin: role === 'SuperAdmin',
      isAdminRegion: role === 'AdminRegion',
      isAdminPointVente: role === 'AdminPointVente',
      isLogisticien: role === 'Logisticien',
      isLoggedIn: !!user && !!role,
    };
  }, [user]);

  return roleChecks;
};
