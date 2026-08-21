'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Permissions {
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  scope: 'all' | 'own';
}

const INITIAL_PERMISSIONS: Permissions = {
  can_view: false,
  can_create: false,
  can_update: false,
  can_delete: false,
  scope: 'all',
};

// Simple global cache to avoid redundant fetches in the same session
const permissionsCache = new Map<string, Permissions>();

export function usePermissions(resource: string) {
  const { profile, user } = useAuth();
  const [permissions, setPermissions] = useState<Permissions>(INITIAL_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  const cacheKey = useMemo(() => {
    return profile ? `${profile.role}:${resource}` : null;
  }, [profile, resource]);

  useEffect(() => {
    // If no user, reset to default deny
    if (!user) {
      setPermissions(INITIAL_PERMISSIONS);
      setLoading(false);
      return;
    }

    // If profile is not loaded yet, stay in loading
    if (!profile) {
      setLoading(true);
      return;
    }

    console.log(`[RBAC] Checking permissions for resource: ${resource} (Role: ${profile.role})`);

    // Admin / DONA / OWNER / SECRETARIA Override
    const isAdmin = ['admin', 'DONA', 'OWNER', 'SECRETARIA'].includes(profile.role);
    if (isAdmin) {
      console.log(`[RBAC] Admin override granted for ${resource}`);
      setPermissions({
        can_view: true,
        can_create: true,
        can_update: true,
        can_delete: true,
        scope: 'all',
      });
      setLoading(false);
      return;
    }

    // Check Cache
    if (cacheKey && permissionsCache.has(cacheKey)) {
      console.log(`[RBAC] Using cached permissions for ${resource}`);
      setPermissions(permissionsCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    // Fetch from database
    const fetchPermissions = async () => {
      try {
        const { data, error } = await supabase
          .from('role_permissions')
          .select('can_view, can_create, can_update, can_delete, scope')
          .eq('role', profile.role)
          .eq('resource', resource)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No permissions found for this role/resource
            console.warn(`[RBAC] No permissions configured for role ${profile.role} on ${resource}`);
            const defaultPerms = INITIAL_PERMISSIONS;
            if (cacheKey) permissionsCache.set(cacheKey, defaultPerms);
            setPermissions(defaultPerms);
          } else {
            console.error(`[RBAC] Error fetching permissions:`, error);
            setPermissions(INITIAL_PERMISSIONS);
          }
        } else if (data) {
          const perms: Permissions = {
            can_view: data.can_view,
            can_create: data.can_create,
            can_update: data.can_update,
            can_delete: data.can_delete,
            scope: data.scope as 'all' | 'own',
          };
          
          if (cacheKey) permissionsCache.set(cacheKey, perms);
          setPermissions(perms);
          console.log(`[RBAC] Permissions loaded for ${resource}:`, perms);
        }
      } catch (err) {
        console.error(`[RBAC] Fatal error in permission check:`, err);
        setPermissions(INITIAL_PERMISSIONS);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [resource, profile, user, cacheKey]);

  const hasPermission = (action: 'view' | 'create' | 'update' | 'delete') => {
    switch (action) {
      case 'view': return permissions.can_view;
      case 'create': return permissions.can_create;
      case 'update': return permissions.can_update;
      case 'delete': return permissions.can_delete;
      default: return false;
    }
  };

  return {
    permissions,
    hasPermission,
    loading,
    isAdmin: profile ? ['admin', 'DONA', 'OWNER', 'SECRETARIA'].includes(profile.role) : false,
  };
}

// Helper to clear cache on logout or role update
export const clearPermissionsCache = () => {
  console.log('[RBAC] Clearing permissions cache');
  permissionsCache.clear();
};
