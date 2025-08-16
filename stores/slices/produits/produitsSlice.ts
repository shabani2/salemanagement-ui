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
  meta?: PaginationMeta;
}

export type Order = 'asc' | 'desc';

export interface FetchParams {
  page?: number;
  limit?: number;
  q?: string;
  categorie?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;    // ex: 'createdAt' | 'nom' | 'prixVente'
  order?: Order;      // 'asc' | 'desc'
  includeTotal?: boolean; // par défaut true
}

interface ProduitStateExtra {
  status: Status;
  error: string | null;
  meta: PaginationMeta | null;
  lastQuery: Omit<FetchParams, 'page' | 'limit'> | null; // on mémorise les filtres/tri
}

const produitAdapter: EntityAdapter<Produit, string> =
  createEntityAdapter<Produit, string>({
    // @ts-ignore
    selectId: (produit) => produit?._id,
    sortComparer: false, // on laisse le tri au backend
  });

const initialState = produitAdapter.getInitialState<ProduitStateExtra>({
  status: 'idle',
  error: null,
  meta: null,
  lastQuery: null,
});

/** ---------- Utils ---------- */
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

    // Le contrôleur renvoie { data, meta }
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

// Suppression (cascade côté backend)
export const deleteProduit = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('produits/deleteProduit', async (produitId, { rejectWithValue }) => {
  try {
    await apiClient.delete(`/produits/${produitId}`, {
      headers: getAuthHeaders(),
    });
    return produitId;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la suppression du produit');
  }
});

// Détail
export const fetchProduitById = createAsyncThunk<
  Produit,
  string,
  { rejectValue: string }
>('produits/fetchProduitById', async (id, { rejectWithValue }) => {
  try {
    const response = await apiClient.get(`/produits/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data as Produit;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération du produit');
  }
});

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

    // Le contrôleur accepte /produits/search avec les mêmes query params
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
    // Utile si tu veux changer localement la page/limit sans relancer le fetch instantanément
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
        state.meta = meta ?? null;

        // on mémorise les filtres/tri utilisés (hors page/limit)
        if (meta) {
          const { page, limit, total, totalPages, hasPrev, hasNext, ...rest } = meta as any;
        }
      })
      .addCase(fetchProduits.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /** addProduit */
      .addCase(addProduit.fulfilled, (state, action) => {
        produitAdapter.addOne(state, action.payload);
        // Optionnel : maj du total
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

      /** searchProduits (paginée) */
      .addCase(searchProduits.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(searchProduits.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { data, meta } = action.payload;
        produitAdapter.setAll(state, data ?? []);
        state.meta = meta ?? null;
      })
      .addCase(searchProduits.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur sur searchProduits';
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
