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
  /** Offset-based côté UI (first/limit). On convertit en page 1-based côté serveur si besoin. */
  first?: number; // offset (skip)
  limit?: number;

  /** Recherche & tri */
  q?: string;
  sortBy?: string; // ex: "updatedAt" | "produit.nom" | "region.nom" | "pointVente.nom" | "quantite"
  order?: 'asc' | 'desc';

  /** Filtres */
  pointVente?: string;
  region?: string;
  produit?: string;
  depotCentral?: boolean;

  /** Flags back */
  includeTotal?: boolean; // par défaut true
  includeRefs?: boolean;  // par défaut true

  /** Si true, on tente d'utiliser une route paginée côté serveur; sinon fallback /stocks (non paginée). */
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

const toQueryString = (obj: Record<string, any>) => {
  const search = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (typeof v === 'boolean') search.append(k, v ? 'true' : 'false');
    else search.append(k, String(v));
  });
  const s = search.toString();
  return s ? `?${s}` : '';
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
  if (pointVente) filtered = filtered.filter((s) => toStr((s as any)?.pointVente?._id ?? (s as any)?.pointVente) === pointVente);
  if (region)     filtered = filtered.filter((s) => toStr((s as any)?.region?._id ?? (s as any)?.region) === region);
  if (produit)    filtered = filtered.filter((s) => toStr((s as any)?.produit?._id ?? (s as any)?.produit) === produit);
  if (typeof depotCentral === 'boolean') filtered = filtered.filter((s) => (s as any)?.depotCentral === depotCentral);

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
      if (sortBy.toLowerCase().includes('date') || sortBy.toLowerCase().includes('updatedat') || sortBy.toLowerCase().includes('createdat')) {
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

  // ✅ Format paginé serveur: { total, page, pages, limit, stocks }
  if (payload && typeof payload === 'object' && 'stocks' in payload) {
    const p: any = payload;
    const list: Stock[] = Array.isArray(p.stocks) ? p.stocks : [];
    const total = Number(p.total ?? list.length);
    const page = Number(p.page ?? Math.floor(first / limit) + 1);
    const pages = Number(p.pages ?? Math.max(1, Math.ceil(total / limit)));
    const _first = (page - 1) * limit;

    return {
      list, // déjà découpé par le serveur
      meta: { total, first: _first, pages, limit },
    };
  }

  // 1) Tableau brut -> filtre/tri/pagination côté client
  if (Array.isArray(payload)) {
    const raw = payload as Stock[];
    const filteredSorted = applyClientFiltersSort(raw, argParams ?? {});
    const total = filteredSorted.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const slice = filteredSorted.slice(first, first + limit);
    return { list: slice, meta: { total, first, pages, limit } };
  }

  // 2) { data, meta? } (meta peut être offset-based OU page-based)
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const obj = payload as { data: unknown; meta?: any };
    const base = Array.isArray(obj.data) ? (obj.data as Stock[]) : [];
    const filteredSorted = applyClientFiltersSort(base, argParams ?? {});

    // si meta donne page/limit/total
    const m = obj.meta ?? {};
    const fromMetaLimit = Number(m.limit ?? limit);
    const fromMetaTotal = Number(m.total ?? filteredSorted.length);
    let _first =
      Number.isFinite(Number(m.first ?? m.offset))
        ? Number(m.first ?? m.offset)
        : Number.isFinite(Number(m.page))
          ? (Number(m.page) - 1) * fromMetaLimit
          : first;

    const pages =
      Number(m.pages ?? m.totalPages) ||
      Math.max(1, Math.ceil(fromMetaTotal / fromMetaLimit));

    const slice = filteredSorted.slice(_first, _first + fromMetaLimit);
    return {
      list: slice,
      meta: {
        total: fromMetaTotal,
        first: Math.max(0, _first),
        pages,
        limit: fromMetaLimit,
      },
    };
  }

  // 3) Mongoose paginate-like: { docs, totalDocs, page, limit, totalPages, ... }
  if (payload && typeof payload === 'object' && 'docs' in payload) {
    const p: any = payload;
    const base: Stock[] = Array.isArray(p.docs) ? p.docs : [];
    const total = Number(p.totalDocs ?? p.total ?? base.length);
    const page = Number(p.page ?? Math.floor(first / limit) + 1);
    const lm = Number(p.limit ?? limit);
    const pages = Number(p.totalPages ?? Math.max(1, Math.ceil(total / lm)));
    const _first = (page - 1) * lm;
    return { list: base, meta: { total, first: _first, pages, limit: lm } };
  }

  // 4) { items, total, page/first, limit }
  if (payload && typeof payload === 'object' && 'items' in payload) {
    const p: any = payload;
    const base: Stock[] = Array.isArray(p.items) ? p.items : [];
    const lm = Number(p.limit ?? limit);
    const total = Number(p.total ?? base.length);
    const pg = Number(p.page ?? Math.floor(first / lm) + 1);
    const _first = Number.isFinite(Number(p.first ?? p.offset)) ? Number(p.first ?? p.offset) : (pg - 1) * lm;
    const pages = Math.max(1, Math.ceil(total / lm));
    return { list: base, meta: { total, first: _first, pages, limit: lm } };
  }

  // Fallback
  return { list: [], meta: { total: 0, first, pages: 1, limit } };
}

/* --------------------------- API helper (serveur/client) --------------------------- */

async function fetchStocksApi(params: FetchStocksParams) {
  const {
    first = 0,
    limit = 10,
    q,
    sortBy = 'updatedAt',
    order = 'desc',
    includeTotal = true,
    includeRefs = true,
    pointVente,
    region,
    produit,
    depotCentral,
    preferServerPage = true,
  } = params;

  // conversion offset -> page (1-based) pour routes paginées
  const page = Math.floor(first / limit) + 1;

  // 1) tenter une route paginée serveur si demandé
  if (preferServerPage) {
    let serverUrl: string | null = null;
    if (pointVente) {
      serverUrl = `/stocks/by-point-vente/${pointVente}/page`;
    } else if (region) {
      serverUrl = `/stocks/by-region/${region}/page`;
    } else {
      serverUrl = `/stocks/page`;
    }

    const qs = toQueryString({
      page,
      limit,
      q,
      sortBy,
      order,
      includeTotal,
      includeRefs,
      produit,
      depotCentral,
    });

    try {
      const r = await apiClient.get(`${serverUrl}${qs}`, { headers: getAuthHeaders() });
      return r.data; // attendu: { total, page, pages, limit, stocks }
    } catch {
      // on tombera sur le fallback non paginé ci-dessous
    }
  }

  // 2) route non paginée -> tableau complet, on pagine côté client
  const fallbackQs = toQueryString({
    // le back peut ignorer ces params, on les utilisera côté client
    first,
    limit,
    q,
    sortBy,
    order,
    includeTotal,
    includeRefs,
    pointVente,
    region,
    produit,
    depotCentral,
  });

  const r2 = await apiClient.get(`/stocks${fallbackQs}`, { headers: getAuthHeaders() });
  return r2.data; // Array<Stock> | {data,meta}…
}

/* -------------------------------- Thunks ---------------------------------- */

// Liste principale
export const fetchStocks = createAsyncThunk<
  unknown, // shape libre : [] | {data, meta} | {docs,...} | {stocks,...}
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
export const fetchStockByRegionId = createAsyncThunk<
  unknown,
  string,
  { rejectValue: string }
>('stocks/fetchByRegionId', async (regionId, { rejectWithValue, dispatch }) => {
  try {
    const res = await dispatch(
      fetchStocks({
        region: regionId,
        includeTotal: true,
        includeRefs: true,
        preferServerPage: true,
      }) as any
    );
    return (res as any).payload;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération des stocks par région');
  }
});

// Wrapper par point de vente (réutilise fetchStocks)
export const fetchStockByPointVenteId = createAsyncThunk<
  unknown,
  string,
  { rejectValue: string }
>('stocks/fetchByPointVenteId', async (pointVenteId, { rejectWithValue, dispatch }) => {
  try {
    const res = await dispatch(
      fetchStocks({
        pointVente: pointVenteId,
        includeTotal: true,
        includeRefs: true,
        preferServerPage: true,
      }) as any
    );
    return (res as any).payload;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération des stocks par point de vente');
  }
});

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
export const checkStock = createAsyncThunk<
  unknown,
  {
    type: string;
    produitId: string;
    quantite: number;
    pointVenteId?: string | undefined | PointVente;
  },
  { rejectValue: string }
>('stocks/checkStock', async (params, { rejectWithValue }) => {
  try {
    const response = await apiClient.post('/stocks/check', { ...params }, { headers: getAuthHeaders() });
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
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
        const { list, meta } = normalizeListPayload(action.payload, state.meta.first, state.meta.limit);
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
        const { list, meta } = normalizeListPayload(action.payload, state.meta.first, state.meta.limit);
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
