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

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

interface ProduitListResponse {
  data: Produit[];
  // côté API, meta peut être { page, limit, total, pages } ou déjà notre shape normalisée
  meta?: Partial<PaginationMeta> & { pages?: number };
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

  // statut dédié à la recherche pour ne pas "polluer" l'état global d'affichage
  searchStatus: Status;
  searchError: string | null;
  searchMeta: PaginationMeta | null;

  lastQuery: Omit<FetchParams, 'page' | 'limit'> | null;
}

const produitAdapter: EntityAdapter<Produit, string> = createEntityAdapter<Produit, string>({
  // @ts-ignore
  selectId: (produit) => produit?._id,
  sortComparer: false, // on laisse le tri au backend
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

/** Normalise la meta quelle que soit la forme renvoyée par l’API */
const normalizeMeta = (raw?: ProduitListResponse['meta']): PaginationMeta | null => {
  if (!raw) return null;
  const page = Math.max(1, Number(raw.page ?? 1));
  const limit = Math.max(1, Number(raw.limit ?? 10));
  const total = Math.max(0, Number(raw.total ?? 0));
  const totalPages = Number.isFinite(Number(raw.totalPages))
    ? Math.max(1, Number(raw.totalPages))
    : Math.max(1, Math.ceil(total / limit || 1));
  // compat: API peut envoyer "pages" au lieu de "totalPages"
  const pagesFromRaw = Number.isFinite(Number((raw as any).pages))
    ? Math.max(1, Number((raw as any).pages))
    : null;
  const finalTotalPages = pagesFromRaw ?? totalPages;

  const hasPrev = page > 1;
  const hasNext = page < finalTotalPages;

  return { page, limit, total, totalPages: finalTotalPages, hasPrev, hasNext };
};

/** ---------- Thunks ---------- */

// Liste paginée / filtrée / triée
export const fetchProduits = createAsyncThunk<
  ProduitListResponse,
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

    return response.data as ProduitListResponse;
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
  ProduitListResponse,
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

    return response.data as ProduitListResponse;
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
        const { data, meta } = action.payload;
        produitAdapter.setAll(state, data ?? []);
        state.meta = normalizeMeta(meta);
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
       * ⚠️ On n'écrase PLUS la liste : on merge (upsertMany) pour que l'autocomplete
       * n’efface pas la page actuelle et que le panier continue d’avoir ses références.
       */
      .addCase(searchProduits.pending, (state) => {
        state.searchStatus = 'loading';
        state.searchError = null;
      })
      .addCase(searchProduits.fulfilled, (state, action) => {
        state.searchStatus = 'succeeded';
        const { data, meta } = action.payload;
        produitAdapter.upsertMany(state, data ?? []);
        state.searchMeta = normalizeMeta(meta);
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

// bonus: sélecteurs dédiés à la recherche (si tu en as besoin un jour)
export const selectProduitSearchStatus = (state: RootState) => state.produits.searchStatus;
export const selectProduitSearchError = (state: RootState) => state.produits.searchError;
export const selectProduitSearchMeta = (state: RootState) => state.produits.searchMeta;
