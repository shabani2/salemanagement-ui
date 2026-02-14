// src/hooks/useTenantOrganisation.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// 'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/stores/store';
import {
  Organisation,
  fetchOrganisations,
  fetchOrganisationById,
  selectCurrentOrganisation,
  selectOrganisationError,
  selectOrganisationStatus,
  setCurrentOrganisation,
} from '@/stores/slices/organisation/organisationSlice';
import { apiClient } from '@/lib/apiConfig';

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

export type UseTenantOrganisationOptions = {
  preferLocalStorage?: boolean;
  autoSaveLocalStorage?: boolean;
  resolveStrategy?: 'auto' | 'id' | 'slug';
};

const ORG_ID_KEYS = ['organisationId', 'orgId', 'tenantId', 'x-tenant-id'];
const ORG_JSON_CACHE_KEY = 'organisationJSON';

function getSlugFromHost(host?: string): string | null {
  if (!host) return null;
  const parts = host.toLowerCase().split('.');
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0];
  return null;
}

function getTenantFromStorage(): { id?: string; slug?: string } {
  if (typeof window === 'undefined') return {};
  for (const key of ORG_ID_KEYS) {
    const val = localStorage.getItem(key);
    if (val && /^[a-fA-F0-9]{24}$/.test(val)) return { id: val };
  }
  const slug = getSlugFromHost(window.location.hostname);
  return slug ? { slug } : {};
}

function ensureTenantHeaders(tenantId?: string, slug?: string) {
  const hdrs = (apiClient.defaults.headers as any) ?? {};
  if (tenantId) {
    hdrs['x-tenant-id'] = tenantId;
    delete hdrs['x-tenant-slug'];
  } else if (slug) {
    hdrs['x-tenant-slug'] = slug.toLowerCase();
    delete hdrs['x-tenant-id'];
  }
  apiClient.defaults.headers = hdrs;
}

export function useTenantOrganisation(
  opts: UseTenantOrganisationOptions = {}
): {
  organisation: Organisation | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  tenantId?: string;
  tenantSlug?: string;
} {
  const {
    preferLocalStorage = true,
    autoSaveLocalStorage = true,
    resolveStrategy = 'auto',
  } = opts;

  const dispatch = useDispatch<AppDispatch>();

  const org = useSelector(selectCurrentOrganisation);
  const status = useSelector(selectOrganisationStatus) as Status;
  const err = useSelector(selectOrganisationError) as string | null;

  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const [tenantSlug, setTenantSlug] = useState<string | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const { id, slug } =
      resolveStrategy === 'id'
        ? (() => {
            const t = getTenantFromStorage();
            return { id: t.id, slug: undefined };
          })()
        : resolveStrategy === 'slug'
        ? (() => {
            const t = getTenantFromStorage();
            return { id: undefined, slug: t.slug };
          })()
        : getTenantFromStorage();

    if (id) setTenantId(id);
    if (!id && slug) setTenantSlug(slug);
    ensureTenantHeaders(id, slug);

    return () => {
      mounted.current = false;
    };
  }, [resolveStrategy]);

  // Hydrate org via cache LS pour réduire le flicker
  useEffect(() => {
    if (!preferLocalStorage || org) return;
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(ORG_JSON_CACHE_KEY);
      if (raw) {
        const cached: Organisation = JSON.parse(raw);
        if (cached && cached._id) {
          dispatch(setCurrentOrganisation(cached));
        }
      }
    } catch {
      // ignore
    }
  }, [preferLocalStorage, org, dispatch]);

  const loadOrg = useCallback(async () => {
    if (!mounted.current) return;
    if (tenantId) {
      const action = await dispatch(fetchOrganisationById(tenantId));
      if ((action as any).error) return;
      const loaded = (action as any).payload as Organisation;
      if (autoSaveLocalStorage && typeof window !== 'undefined' && loaded?._id) {
        localStorage.setItem(ORG_JSON_CACHE_KEY, JSON.stringify(loaded));
        localStorage.setItem('organisationId', loaded._id);
      }
      return;
    }
    // Fallback liste (déjà scindée par tenant côté API)
    const act = await dispatch(fetchOrganisations());
    if ((act as any).error) return;
    const list = (act as any).payload as Organisation[];
    const first = Array.isArray(list) ? list[0] : null;
    if (first && autoSaveLocalStorage && typeof window !== 'undefined') {
      localStorage.setItem(ORG_JSON_CACHE_KEY, JSON.stringify(first));
      localStorage.setItem('organisationId', first._id);
    }
  }, [tenantId, dispatch, autoSaveLocalStorage]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!org) void loadOrg();
  }, [org, status, loadOrg]);

  const refresh = useCallback(async () => {
    await loadOrg();
  }, [loadOrg]);

  const loading: boolean =
    status === 'loading' || (!org && Boolean(tenantId || tenantSlug));

  return useMemo(
    () => ({
      organisation: org ?? null,
      loading,
      error: err,
      refresh,
      tenantId,
      tenantSlug,
    }),
    [org, loading, err, refresh, tenantId, tenantSlug]
  );
}
