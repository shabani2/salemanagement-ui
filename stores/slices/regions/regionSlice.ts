/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  EntityAdapter,
  PayloadAction,
} from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import { Region } from '@/Models/regionTypes';

/** ---------------- Types pagination & requêtes ---------------- */
type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export type Order = 'asc' | 'desc';

export interface FetchParams {
  page?: number;
  limit?: number;
  q?: string;
  ville?: string;
  sortBy?: string; // ex: 'createdAt' | 'nom' | 'ville' | 'pointVenteCount'
  order?: Order; // 'asc' | 'desc'
  includeTotal?: boolean; // par défaut true
}

interface RegionListResponse {
  data: Region[]; // le contrôleur renvoie { nom, ville, pointVenteCount?, _id }
  meta?: PaginationMeta;
}

type RegionWithCount = Region & { pointVenteCount?: number };

interface RegionStateExtra {
  status: Status;
  error: string | null;
  meta: PaginationMeta | null;
  lastQuery: Omit<FetchParams, 'page' | 'limit'> | null;
}

/** ---------------- Adapter ---------------- */
const regionAdapter: EntityAdapter<RegionWithCount, string> = createEntityAdapter<
  RegionWithCount,
  string
>({
  // @ts-ignore
  selectId: (region) => region._id,
  sortComparer: false, // tri géré côté serveur
});

const initialState = regionAdapter.getInitialState<RegionStateExtra>({
  status: 'idle',
  error: null,
  meta: null,
  lastQuery: null,
});

/** ---------------- Utils ---------------- */
const getAuthHeaders = () => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const toQueryString = (params: Record<string, any>) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

/** ---------------- Thunks ---------------- */

// Liste paginée / triée / filtrée
export const fetchRegions = createAsyncThunk<
  RegionListResponse,
  FetchParams | undefined,
  { rejectValue: string }
>('regions/fetchRegions', async (params, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      ville,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
    } = params || {};

    const query = toQueryString({
      page,
      limit,
      q,
      ville,
      sortBy,
      order,
      includeTotal,
    });

    const response = await apiClient.get(`/regions${query}`, {
      headers: getAuthHeaders(),
    });

    return response.data as RegionListResponse;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération des régions');
  }
});

// Recherche paginée (mêmes params)
export const searchRegions = createAsyncThunk<
  RegionListResponse,
  FetchParams & { q: string },
  { rejectValue: string }
>('regions/searchRegions', async (params, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      ville,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
    } = params;

    const query = toQueryString({
      page,
      limit,
      q,
      ville,
      sortBy,
      order,
      includeTotal,
    });

    const response = await apiClient.get(`/regions/search${query}`, {
      headers: getAuthHeaders(),
    });

    return response.data as RegionListResponse;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la recherche des régions');
  }
});

// Création
export const addRegion = createAsyncThunk<
  RegionWithCount,
  Omit<Region, '_id'>,
  { rejectValue: string }
>('regions/addRegion', async (region, { rejectWithValue }) => {
  try {
    const response = await apiClient.post('/regions', region, {
      headers: getAuthHeaders(),
    });
    return response.data as RegionWithCount;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de l’ajout de la région');
  }
});

// Mise à jour
export const updateRegion = createAsyncThunk<
  RegionWithCount,
  Region & { pointVenteCount?: number },
  { rejectValue: string }
>('regions/updateRegion', async (region, { rejectWithValue }) => {
  try {
    const response = await apiClient.put(`/regions/${region._id}`, region, {
      headers: getAuthHeaders(),
    });
    return response.data as RegionWithCount;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la mise à jour de la région');
  }
});

// Suppression
export const deleteRegion = createAsyncThunk<string, string, { rejectValue: string }>(
  'regions/deleteRegion',
  async (regionId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/regions/${regionId}`, {
        headers: getAuthHeaders(),
      });
      return regionId;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la suppression de la région');
    }
  }
);

/** ---------------- Slice ---------------- */
const regionSlice = createSlice({
  name: 'regions',
  initialState,
  reducers: {
    setMeta(state, action: PayloadAction<PaginationMeta | null>) {
      state.meta = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      /** fetchRegions */
      .addCase(fetchRegions.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRegions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { data, meta } = action.payload;
        regionAdapter.setAll(state, data ?? []);
        state.meta = meta ?? null;
      })
      .addCase(fetchRegions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /** searchRegions */
      .addCase(searchRegions.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(searchRegions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { data, meta } = action.payload;
        regionAdapter.setAll(state, data ?? []);
        state.meta = meta ?? null;
      })
      .addCase(searchRegions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /** addRegion */
      .addCase(addRegion.fulfilled, (state, action) => {
        regionAdapter.addOne(state, action.payload);
        if (state.meta) {
          state.meta.total += 1;
          state.meta.totalPages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
        }
      })

      /** updateRegion */
      .addCase(updateRegion.fulfilled, (state, action) => {
        regionAdapter.upsertOne(state, action.payload);
      })

      /** deleteRegion */
      .addCase(deleteRegion.fulfilled, (state, action) => {
        regionAdapter.removeOne(state, action.payload);
        if (state.meta) {
          state.meta.total = Math.max(0, state.meta.total - 1);
          state.meta.totalPages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
        }
      });
  },
});

export const { setMeta } = regionSlice.actions;
export const regionReducer = regionSlice.reducer;

/** ---------------- Selectors ---------------- */
export const {
  selectAll: selectAllRegions,
  selectById: selectRegionById,
  selectEntities: selectRegionEntities,
  selectIds: selectRegionIds,
  selectTotal: selectTotalRegions,
} = regionAdapter.getSelectors<RootState>((state) => state.regions);

export const selectRegionStatus = (state: RootState) => state.regions.status;
export const selectRegionError = (state: RootState) => state.regions.error;
export const selectRegionMeta = (state: RootState) => state.regions.meta;
