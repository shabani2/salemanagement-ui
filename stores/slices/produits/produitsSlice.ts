/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Produit, ProduitModel } from '@/Models/produitsType';

/** ---------- Types pagination & requêtes ---------- */
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
  categorie?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string; // ex: 'createdAt' | 'nom' | 'prixVente'
  order?: Order; // 'asc' | 'desc'
  includeTotal?: boolean; // par défaut true
}

interface ProduitStateExtra {
  status: Status;
  error: string | null;
  meta: PaginationMeta | null;

  // état de recherche, séparé
  searchStatus: Status;
  searchError: string | null;
  searchMeta: PaginationMeta | null;

  lastQuery: Omit<FetchParams, 'page' | 'limit'> | null;
}

const produitAdapter: EntityAdapter<Produit, string> = createEntityAdapter<Produit, string>({
  // @ts-expect-error - compat: certains modèles externes typent _id différemment
  selectId: (produit) => produit?._id,
  sortComparer: false, // tri délégué au backend
});

const initialState = produitAdapter.getInitialState<ProduitStateExtra>({
  status: 'idle',
  error: null,
  meta: null,

  searchStatus: 'idle',
  searchError: null,
  searchMeta: null,

  lastQuery: null,
});

/** ---------- Utils ---------- */
const getAuthHeaders = () => {
  try {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('token-agricap');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
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

/** Normalise n’importe quel payload liste en { list, meta } */
function normalizeListPayload(
  payload: unknown,
  argPage?: number,
  argLimit?: number
): { list: Produit[]; meta: PaginationMeta | null } {
  // 1) Tableau brut
  if (Array.isArray(payload)) {
    const page = argPage ?? 1;
    const limit = argLimit ?? (payload.length || 10);
    const total = payload.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      list: payload as Produit[],
      meta: { page, limit, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages },
    };
  }

  // 2) { data, meta? }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const obj = payload as { data: unknown; meta?: Partial<PaginationMeta> & { pages?: number } };
    const list = Array.isArray(obj.data) ? (obj.data as Produit[]) : [];
    const page = (obj.meta?.page ?? argPage ?? 1) as number;
    const limit = (obj.meta?.limit ?? argLimit ?? (list.length || 10)) as number;
    const total = (obj.meta?.total ?? list.length) as number;

    // compat: totalPages | pages
    const totalPagesFromMeta =
      (obj.meta?.totalPages as number | undefined) ??
      (obj.meta?.pages as number | undefined) ??
      Math.max(1, Math.ceil(total / limit));

    const hasPrev = (obj.meta?.hasPrev as boolean | undefined) ?? page > 1;
    const hasNext = (obj.meta?.hasNext as boolean | undefined) ?? page < totalPagesFromMeta;

    return {
      list,
      meta: { page, limit, total, totalPages: totalPagesFromMeta, hasPrev, hasNext },
    };
  }

  // 3) Mongoose paginate-like: { docs, totalDocs, page, limit, totalPages, hasPrevPage, hasNextPage }
  if (payload && typeof payload === 'object' && 'docs' in payload) {
    const p: any = payload;
    const list: Produit[] = Array.isArray(p.docs) ? p.docs : [];
    const page = Number(p.page ?? argPage ?? 1);
    const limit = Number(p.limit ?? argLimit ?? (list.length || 10));
    const total = Number(p.totalDocs ?? p.total ?? list.length);
    const totalPages = Number(p.totalPages ?? Math.max(1, Math.ceil(total / limit)));
    const hasPrev = Boolean(p.hasPrevPage ?? page > 1);
    const hasNext = Boolean(p.hasNextPage ?? page < totalPages);
    return { list, meta: { page, limit, total, totalPages, hasPrev, hasNext } };
  }

  // 4) { items, total, page, limit } ou autre variante
  if (payload && typeof payload === 'object' && 'items' in payload) {
    const p: any = payload;
    const list: Produit[] = Array.isArray(p.items) ? p.items : [];
    const page = Number(p.page ?? argPage ?? 1);
    const limit = Number(p.limit ?? argLimit ?? (list.length || 10));
    const total = Number(p.total ?? list.length);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      list,
      meta: { page, limit, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages },
    };
  }

  // Fallback
  return {
    list: [],
    meta: { page: argPage ?? 1, limit: argLimit ?? 10, total: 0, totalPages: 1, hasPrev: false, hasNext: false },
  };
}

/** ---------- Thunks ---------- */

// Liste paginée / filtrée / triée
export const fetchProduits = createAsyncThunk<
  unknown, // shape libre; on normalise côté reducer
  FetchParams | undefined,
  { rejectValue: string }
>('produits/fetchProduits', async (params, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      categorie,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
    } = params || {};

    const query = toQueryString({
      page,
      limit,
      q,
      categorie,
      minPrice,
      maxPrice,
      sortBy,
      order,
      includeTotal,
    });

    const response = await apiClient.get(`/produits${query}`, {
      headers: getAuthHeaders(),
    });

    return response.data; // [] | {data, meta} | {docs,...}
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération des produits');
  }
});

// Création
export const addProduit = createAsyncThunk<
  Produit,
  Omit<ProduitModel, '_id'>,
  { rejectValue: string }
>('produits/addProduit', async (produit, { rejectWithValue }) => {
  try {
    const response = await apiClient.post('/produits', produit, {
      headers: getAuthHeaders(),
    });
    return response.data as Produit;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la création du produit');
  }
});

// Suppression
export const deleteProduit = createAsyncThunk<string, string, { rejectValue: string }>(
  'produits/deleteProduit',
  async (produitId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/produits/${produitId}`, {
        headers: getAuthHeaders(),
      });
      return produitId;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la suppression du produit');
    }
  }
);

// Détail
export const fetchProduitById = createAsyncThunk<Produit, string, { rejectValue: string }>(
  'produits/fetchProduitById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/produits/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data as Produit;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la récupération du produit');
    }
  }
);

// Mise à jour
export const updateProduit = createAsyncThunk<
  Produit,
  {
    _id: string;
    nom?: string;
    categorie?: string;
    prix?: number;
    tva?: number;
    prixVente?: number;
    marge?: number;
    netTopay?: number;
    unite?: string;
    seuil?: number;
  },
  { rejectValue: string }
>('produits/updateProduit', async (produit, { rejectWithValue }) => {
  try {
    const { _id, ...data } = produit;
    const response = await apiClient.put(`/produits/${_id}`, data, {
      headers: getAuthHeaders(),
    });
    return response.data as Produit;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la mise à jour du produit');
  }
});

// Recherche paginée (mêmes params + q obligatoire)
export const searchProduits = createAsyncThunk<
  unknown, // shape libre; normalisé au reducer
  FetchParams & { q: string },
  { rejectValue: string }
>('produits/searchProduits', async (params, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      categorie,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
    } = params;

    const query = toQueryString({
      page,
      limit,
      q,
      categorie,
      minPrice,
      maxPrice,
      sortBy,
      order,
      includeTotal,
    });

    const response = await apiClient.get(`/produits/search${query}`, {
      headers: getAuthHeaders(),
    });

    return response.data; // [] | {data, meta} | {docs,...}
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la recherche des produits');
  }
});

/** ---------- Slice ---------- */
const produitSlice = createSlice({
  name: 'produits',
  initialState,
  reducers: {
    setMeta(state, action: PayloadAction<PaginationMeta | null>) {
      state.meta = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      /** fetchProduits */
      .addCase(fetchProduits.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProduits.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // normalisation robuste
        const params = action.meta.arg ?? {};
        const { list, meta } = normalizeListPayload(action.payload, params.page, params.limit);
        produitAdapter.setAll(state, list ?? []);
        state.meta = meta;
        // mémorise la dernière query (sans page/limit)
        const { page, limit, ...rest } = params || {};
        state.lastQuery = rest ?? null;
      })
      .addCase(fetchProduits.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /** addProduit */
      .addCase(addProduit.fulfilled, (state, action) => {
        produitAdapter.addOne(state, action.payload);
        if (state.meta) {
          state.meta.total += 1;
          state.meta.totalPages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
        }
      })
      .addCase(addProduit.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur sur addProduit';
      })

      /** deleteProduit */
      .addCase(deleteProduit.fulfilled, (state, action) => {
        produitAdapter.removeOne(state, action.payload);
        if (state.meta) {
          state.meta.total = Math.max(0, state.meta.total - 1);
          state.meta.totalPages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
        }
      })
      .addCase(deleteProduit.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur sur deleteProduit';
      })

      /** fetchProduitById */
      .addCase(fetchProduitById.fulfilled, (state, action) => {
        produitAdapter.upsertOne(state, action.payload);
      })
      .addCase(fetchProduitById.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur sur fetchProduitById';
      })

      /** updateProduit */
      .addCase(updateProduit.fulfilled, (state, action) => {
        produitAdapter.upsertOne(state, action.payload);
      })
      .addCase(updateProduit.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur sur updateProduit';
      })

      /**
       * searchProduits
       * On MERGE (upsertMany) la liste pour ne pas écraser l’affichage principal.
       * La pagination des résultats de recherche est stockée dans searchMeta.
       */
      .addCase(searchProduits.pending, (state) => {
        state.searchStatus = 'loading';
        state.searchError = null;
      })
      .addCase(searchProduits.fulfilled, (state, action) => {
        state.searchStatus = 'succeeded';
        const params = action.meta.arg ?? {};
        const { list, meta } = normalizeListPayload(action.payload, params.page, params.limit);
        produitAdapter.upsertMany(state, list ?? []);
        state.searchMeta = meta;
      })
      .addCase(searchProduits.rejected, (state, action) => {
        state.searchStatus = 'failed';
        state.searchError = (action.payload as string) ?? 'Erreur sur searchProduits';
      });
  },
});

export const { setMeta } = produitSlice.actions;
export const produitReducer = produitSlice.reducer;

/** ---------- Selectors ---------- */
export const {
  selectAll: selectAllProduits,
  selectById: selectProduitById,
  selectEntities: selectProduitEntities,
  selectIds: selectProduitIds,
  selectTotal: selectTotalProduits,
} = produitAdapter.getSelectors<RootState>((state) => state.produits);

export const selectProduitStatus = (state: RootState) => state.produits.status;
export const selectProduitError = (state: RootState) => state.produits.error;
export const selectProduitMeta = (state: RootState) => state.produits.meta;

export const selectProduitSearchStatus = (state: RootState) => state.produits.searchStatus;
export const selectProduitSearchError = (state: RootState) => state.produits.searchError;
export const selectProduitSearchMeta = (state: RootState) => state.produits.searchMeta;
