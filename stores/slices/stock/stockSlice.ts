/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  EntityAdapter,
} from '@reduxjs/toolkit';
import type { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import type { Stock } from '@/Models/stock';
import type { PointVente } from '@/Models/pointVenteType';

/* ----------------------------- Types état/meta ----------------------------- */
export interface CheckStockResponse {
  success: boolean;
  quantiteDisponible: number;
  suffisant: boolean;
}

export interface ListMeta {
  total: number; // total d'items
  first: number; // offset courant (skip)
  pages: number; // nb pages = ceil(total/limit)
  limit: number; // taille de page
}

interface StockState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  meta: ListMeta;
}

export type FetchStocksParams = {
  /** Offset-based côté UI (first/limit). */
  first?: number; // offset (skip)
  limit?: number;

  /** Recherche & tri (appliqués côté client) */
  q?: string;
  sortBy?: string; // ex: "updatedAt" | "produit.nom" | "region.nom" | "pointVente.nom" | "quantite"
  order?: 'asc' | 'desc';

  /** Filtres (côté client si route = /stocks) ; côté serveur si route dédiée) */
  pointVente?: string;
  region?: string;
  produit?: string;
  depotCentral?: boolean;

  /** Conservé pour compatibilité, ignoré (pas de pagination serveur dans tes routes) */
  preferServerPage?: boolean;
};

/* -------------------------------- Adapter --------------------------------- */
const stockAdapter: EntityAdapter<Stock, string> = createEntityAdapter<Stock, string>({
  selectId: (stock) => stock._id,
  sortComparer: false,
});

const initialState = stockAdapter.getInitialState<StockState>({
  status: 'idle',
  error: null,
  meta: { total: 0, first: 0, pages: 1, limit: 10 },
});

/* ------------------------------- Helpers ---------------------------------- */
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token-agricap') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getValByPath = (obj: any, path?: string) => {
  if (!path) return undefined;
  return path.split('.').reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
};
const toStr = (v: unknown) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

/** Filtre/tri côté client si le backend renvoie un tableau brut (non paginé) */
function applyClientFiltersSort(list: Stock[], params: FetchStocksParams): Stock[] {
  const { q, sortBy, order = 'desc', pointVente, region, produit, depotCentral } = params;

  let filtered = list;

  // filtres structurés
  if (pointVente)
    filtered = filtered.filter(
      (s) => toStr((s as any)?.pointVente?._id ?? (s as any)?.pointVente) === pointVente
    );
  if (region)
    filtered = filtered.filter(
      (s) => toStr((s as any)?.region?._id ?? (s as any)?.region) === region
    );
  if (produit)
    filtered = filtered.filter(
      (s) => toStr((s as any)?.produit?._id ?? (s as any)?.produit) === produit
    );
  if (typeof depotCentral === 'boolean')
    filtered = filtered.filter((s) => (s as any)?.depotCentral === depotCentral);

  // recherche texte (produit.nom, pointVente.nom, region.nom)
  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    filtered = filtered.filter((s) => {
      const pn = getValByPath(s, 'produit.nom');
      const pvn = getValByPath(s, 'pointVente.nom');
      const rn = getValByPath(s, 'region.nom');
      return [pn, pvn, rn].some((v) => toStr(v).toLowerCase().includes(needle));
    });
  }

  // tri
  if (sortBy) {
    const desc = order === 'desc' ? -1 : 1;
    filtered = [...filtered].sort((a, b) => {
      const av = getValByPath(a, sortBy);
      const bv = getValByPath(b, sortBy);

      // date
      if (
        sortBy.toLowerCase().includes('date') ||
        sortBy.toLowerCase().includes('updatedat') ||
        sortBy.toLowerCase().includes('createdat')
      ) {
        const ad = av ? new Date(av as any).getTime() : 0;
        const bd = bv ? new Date(bv as any).getTime() : 0;
        return (ad - bd) * desc;
      }
      // nombre
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * desc;
      // def: string
      return toStr(av).localeCompare(toStr(bv)) * desc;
    });
  }

  return filtered;
}

/** Normalise n’importe quel payload liste en { list, meta } avec OFFSET (first/limit) */
function normalizeListPayload(
  payload: unknown,
  argFirst: number = 0,
  argLimit: number = 10,
  argParams?: FetchStocksParams
): { list: Stock[]; meta: ListMeta } {
  const first = Math.max(0, argFirst ?? 0);
  const limit = Math.max(1, argLimit ?? 10);

  // 1) Tableau brut -> filtre/tri/pagination côté client
  if (Array.isArray(payload)) {
    const raw = payload as Stock[];
    const filteredSorted = applyClientFiltersSort(raw, argParams ?? {});
    const total = filteredSorted.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const slice = filteredSorted.slice(first, first + limit);
    return { list: slice, meta: { total, first, pages, limit } };
  }

  // 2) Formats alternatifs (non utilisés par tes routes actuelles) — fallback
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const obj = payload as { data: unknown; meta?: any };
    const base = Array.isArray(obj.data) ? (obj.data as Stock[]) : [];
    const filteredSorted = applyClientFiltersSort(base, argParams ?? {});
    const total = filteredSorted.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const slice = filteredSorted.slice(first, first + limit);
    return { list: slice, meta: { total, first, pages, limit } };
  }

  return { list: [], meta: { total: 0, first, pages: 1, limit } };
}

/* --------------------------- API helper --------------------------- */
/**
 * Choisit la route en fonction des params:
 * - region -> GET /stocks/region/:regionId
 * - pointVente -> GET /stocks/stock-by-pv/:pointVenteId
 * - default -> GET /stocks
 * Les filtres/tri recherchés non supportés par l'API sont appliqués côté client.
 */
async function fetchStocksApi(params: FetchStocksParams) {
  const { region, pointVente } = params;

  let url = '/stocks';
  if (pointVente) url = `/stocks/stock-by-pv/${pointVente}`;
  else if (region) url = `/stocks/region/${region}`;

  const r = await apiClient.get(url, { headers: getAuthHeaders() });
  return r.data; // Array<Stock>
}

/* -------------------------------- Thunks ---------------------------------- */

// Liste principale
export const fetchStocks = createAsyncThunk<
  unknown, // [] | {data, meta}…
  FetchStocksParams | undefined,
  { rejectValue: string }
>('stocks/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await fetchStocksApi(params ?? {});
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération des stocks');
  }
});

// Wrapper par région (réutilise fetchStocks)
export const fetchStockByRegionId = createAsyncThunk<unknown, string, { rejectValue: string }>(
  'stocks/fetchByRegionId',
  async (regionId, { rejectWithValue, dispatch }) => {
    try {
      const res = await dispatch(
        fetchStocks({
          region: regionId,
        }) as any
      );
      return (res as any).payload;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la récupération des stocks par région');
    }
  }
);

// Wrapper par point de vente (réutilise fetchStocks)
export const fetchStockByPointVenteId = createAsyncThunk<unknown, string, { rejectValue: string }>(
  'stocks/fetchByPointVenteId',
  async (pointVenteId, { rejectWithValue, dispatch }) => {
    try {
      const res = await dispatch(
        fetchStocks({
          pointVente: pointVenteId,
        }) as any
      );
      return (res as any).payload;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la récupération des stocks par point de vente');
    }
  }
);

export const fetchStockById = createAsyncThunk<Stock, string, { rejectValue: string }>(
  'stocks/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/stocks/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data as Stock;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la récupération du stock');
    }
  }
);

export const createStock = createAsyncThunk<Stock, Omit<Stock, '_id'>, { rejectValue: string }>(
  'stocks/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/stocks', data, { headers: getAuthHeaders() });
      return response.data as Stock;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la création du stock');
    }
  }
);

export const updateStock = createAsyncThunk<
  Stock,
  { _id: string; [key: string]: any },
  { rejectValue: string }
>('stocks/update', async (data, { rejectWithValue }) => {
  try {
    const response = await apiClient.put(`/stocks/${data._id}`, data, {
      headers: getAuthHeaders(),
    });
    return response.data as Stock;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return rejectWithValue(error.message);
    }
    return rejectWithValue('Erreur lors de la mise à jour du stock');
  }
});

export const deleteStock = createAsyncThunk<string, string, { rejectValue: string }>(
  'stocks/delete',
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/stocks/${id}`, { headers: getAuthHeaders() });
      return id;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la suppression du stock');
    }
  }
);

// Vérification de stock (pas stocké dans l'entity adapter)
// ➜ Ajoute le flag depotCentral
export interface CheckStockParams {
  type: string;
  produitId: string;
  quantite: number;
  pointVenteId?: string | PointVente; // on accepte aussi l’objet pour commodité
  regionId?: string;
  depotCentral?: boolean; // ✅ nouveau
}

// (facultatif) Typage de la réponse si tu ne l’as pas déjà
export interface CheckStockResponse {
  success: boolean;
  quantiteDisponible: number;
  suffisant: boolean;
  message?: string;
}

// petit util pour normaliser le payload envoyé à l’API
const buildCheckStockPayload = (params: CheckStockParams) => {
  const pointVenteId =
    typeof params.pointVenteId === 'string'
      ? params.pointVenteId
      : (params.pointVenteId as PointVente | undefined)?._id;

  const payload: any = {
    type: params.type,
    produitId: params.produitId,
    quantite: params.quantite,
  };

  // ✅ exclusivité : si depotCentral === true, on n’envoie ni regionId ni pointVenteId
  if (params.depotCentral) {
    payload.depotCentral = true;
  } else {
    if (params.regionId) payload.regionId = params.regionId;
    if (pointVenteId) payload.pointVenteId = pointVenteId;
  }

  return payload;
};

export const checkStock = createAsyncThunk<
  CheckStockResponse,
  CheckStockParams,
  { rejectValue: string }
>('stocks/checkStock', async (params, { rejectWithValue }) => {
  try {
    const payload = buildCheckStockPayload(params);

    const response = await apiClient.post('/stocks/check', payload, {
      headers: getAuthHeaders(),
    });

    return response.data as CheckStockResponse;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return rejectWithValue(error.message);
    }
    return rejectWithValue('Erreur lors de la vérification du stock');
  }
});

/* --------------------------------- Slice ---------------------------------- */

const stockSlice = createSlice({
  name: 'stocks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      /* fetchStocks (liste principale) */
      .addCase(fetchStocks.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchStocks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const params = (action.meta.arg ?? {}) as FetchStocksParams;
        const first = params.first ?? 0;
        const limit = params.limit ?? state.meta.limit ?? 10;
        const { list, meta } = normalizeListPayload(action.payload, first, limit, params);
        stockAdapter.setAll(state, list ?? []);
        state.meta = meta;
      })
      .addCase(fetchStocks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* fetchStockByRegionId */
      .addCase(fetchStockByRegionId.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchStockByRegionId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const params = { region: 'X' } as FetchStocksParams; // dummy pour garder la même pagination locale
        const { list, meta } = normalizeListPayload(
          action.payload,
          state.meta.first,
          state.meta.limit,
          params
        );
        stockAdapter.setAll(state, list ?? []);
        state.meta = meta;
      })
      .addCase(fetchStockByRegionId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* fetchStockByPointVenteId */
      .addCase(fetchStockByPointVenteId.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchStockByPointVenteId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const params = { pointVente: 'X' } as FetchStocksParams;
        const { list, meta } = normalizeListPayload(
          action.payload,
          state.meta.first,
          state.meta.limit,
          params
        );
        stockAdapter.setAll(state, list ?? []);
        state.meta = meta;
      })
      .addCase(fetchStockByPointVenteId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* Détail / CRUD */
      .addCase(fetchStockById.fulfilled, (state, action) => {
        stockAdapter.upsertOne(state, action.payload);
      })
      .addCase(createStock.fulfilled, (state, action) => {
        stockAdapter.addOne(state, action.payload);
        if (state.meta) {
          state.meta.total += 1;
          state.meta.pages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
        }
      })
      .addCase(updateStock.fulfilled, (state, action) => {
        stockAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteStock.fulfilled, (state, action) => {
        stockAdapter.removeOne(state, action.payload);
        if (state.meta) {
          state.meta.total = Math.max(0, state.meta.total - 1);
          state.meta.pages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
        }
      });
  },
});

/* ------------------------------- Exports ---------------------------------- */
export const stockReducer = stockSlice.reducer;

export const {
  selectAll: selectAllStocks,
  selectById: selectStockById,
  selectEntities: selectStockEntities,
  selectIds: selectStockIds,
  selectTotal: selectTotalStocks,
} = stockAdapter.getSelectors<RootState>((state) => state.stocks);

export const selectStockStatus = (state: RootState) => state.stocks.status;
export const selectStockError = (state: RootState) => state.stocks.error;
export const selectStockMeta = (state: RootState) => state.stocks.meta;
