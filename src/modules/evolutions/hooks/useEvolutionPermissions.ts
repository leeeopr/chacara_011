'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { techLog } from '../utils/calculations';
import { useEffect } from 'react';

export function useEvolutionPermissions() {
  const { permissions, loading, isAdmin } = usePermissions('evolucoes');

  const canView = permissions.can_view || isAdmin;
  const canCreate = permissions.can_create || isAdmin;
  const canUpdate = permissions.can_update || isAdmin;
  const canDelete = permissions.can_delete || isAdmin;

  useEffect(() => {
    if (!loading) {
      techLog('Permissions', 'RBAC verified for evolutions resource', {
        canView,
        canCreate,
        canUpdate,
        canDelete,
        isAdmin
      });
    }
  }, [canView, canCreate, canUpdate, canDelete, isAdmin, loading]);

  return {
    canView,
    canCreate,
    canUpdate,
    canDelete,
    isAdmin,
    loading
  };
}
