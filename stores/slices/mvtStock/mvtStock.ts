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
  // Assure-toi que apiClient pointe vers ton backend
import { apiClient } from '../../../lib/apiConfig';
import { MouvementStock } from '@/Models/mouvementStockType';

/* ---------------- Types génériques (pagination / tri / filtres) ---------------- */

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';
export type Order = 'asc' | 'desc';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface FetchParams {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: string;     // ex: 'createdAt' | 'type' | ...
  order?: Order;       // 'asc' | 'desc'
  includeTotal?: boolean; // default true
  includeRefs?: boolean;  // default true

  // Filtres
  region?: string;
  pointVente?: string;
  user?: string;
  produit?: string;
  type?: string;       // 'Livraison' | 'Retour' | ...
  statut?: boolean;    // validé ou non
  depotCentral?: boolean;
  dateFrom?: string;   // 'YYYY-MM-DD'
  dateTo?: string;     // 'YYYY-MM-DD'
}

interface MouvementListResponse<T = MouvementStock> {
  data: T[];
  meta?: PaginationMeta | null;
}

/* ---------------- State ---------------- */

interface MouvementStockStateExtra {
  status: Status;
  error: string | null;
  meta: PaginationMeta | null;

  // Espace pour les résultats d'agrégation (optionnel)
  aggregate: {
    status: Status;
    error: string | null;
    data: any[];
    meta: PaginationMeta | null;
  };
}

const mouvementStockAdapter: EntityAdapter<MouvementStock, string> =
  createEntityAdapter<MouvementStock, string>({
    selectId: (mouvement) => mouvement._id,
    sortComparer: false, // tri côté serveur
  });

const initialState = mouvementStockAdapter.getInitialState<MouvementStockStateExtra>({
  status: 'idle',
  error: null,
  meta: null,
  aggregate: { status: 'idle', error: null, data: [], meta: null },
});

/* ---------------- Utils ---------------- */

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

/* ---------------- Thunks (API /mouvements) ---------------- */

// Liste paginée/triée/filtrée
export const fetchMouvementsStock = createAsyncThunk<
  MouvementListResponse<MouvementStock>,
  FetchParams | undefined,
  { rejectValue: string }
>('mouvementStock/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
      includeRefs = true,
      region,
      pointVente,
      user,
      produit,
      type,
      statut,
      depotCentral,
      dateFrom,
      dateTo,
    } = params || {};

    const query = toQueryString({
      page,
      limit,
      q,
      sortBy,
      order,
      includeTotal,
      includeRefs,
      region,
      pointVente,
      user,
      produit,
      type,
      statut,
      depotCentral,
      dateFrom,
      dateTo,
    });

    const response = await apiClient.get(`/mouvements${query}`, {
      headers: getAuthHeaders(),
    });
    return response.data as MouvementListResponse<MouvementStock>;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération des mouvements de stock');
  }
});

// Recherche (alias du listing, mais dédié si tu veux distinguer côté UI)
export const searchMouvementsStock = createAsyncThunk<
  MouvementListResponse<MouvementStock>,
  FetchParams & { q: string },
  { rejectValue: string }
>('mouvementStock/search', async (params, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
      includeRefs = true,
      region,
      pointVente,
      user,
      produit,
      type,
      statut,
      depotCentral,
      dateFrom,
      dateTo,
    } = params;

    const query = toQueryString({
      page,
      limit,
      q,
      sortBy,
      order,
      includeTotal,
      includeRefs,
      region,
      pointVente,
      user,
      produit,
      type,
      statut,
      depotCentral,
      dateFrom,
      dateTo,
    });

    const response = await apiClient.get(`/mouvements/search${query}`, {
      headers: getAuthHeaders(),
    });
    return response.data as MouvementListResponse<MouvementStock>;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la recherche des mouvements');
  }
});

// Détail
export const fetchMouvementStockById = createAsyncThunk<
  MouvementStock,
  { id: string; includeRefs?: boolean },
  { rejectValue: string }
>('mouvementStock/fetchById', async ({ id, includeRefs = true }, { rejectWithValue }) => {
  try {
    const response = await apiClient.get(`/mouvements/${id}${toQueryString({ includeRefs })}`, {
      headers: getAuthHeaders(),
    });
    return response.data as MouvementStock;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération du mouvement de stock');
  }
});

// Création
type CreateMouvementStockData = Omit<MouvementStock, '_id'> & { user: string };
export const createMouvementStock = createAsyncThunk<
  MouvementStock,
  CreateMouvementStockData,
  { rejectValue: string }
>('mouvementStock/create', async (data, { rejectWithValue }) => {
  try {
    if (!data.user) return rejectWithValue("Le champ 'user' est obligatoire");
    const response = await apiClient.post('/mouvements', data, {
      headers: getAuthHeaders(),
    });
    return response.data as MouvementStock;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la création du mouvement de stock');
  }
});

// Mise à jour
export const updateMouvementStock = createAsyncThunk<
  MouvementStock,
  { id: string; updateData: Partial<MouvementStock> },
  { rejectValue: string }
>('mouvementStock/update', async ({ id, updateData }, { rejectWithValue }) => {
  try {
    if (!updateData.user) return rejectWithValue("Le champ 'user' est obligatoire");
    const response = await apiClient.put(`/mouvements/${id}`, updateData, {
      headers: getAuthHeaders(),
    });
    return response.data as MouvementStock;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la mise à jour du mouvement de stock');
  }
});

// Suppression
export const deleteMouvementStock = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('mouvementStock/delete', async (id, { rejectWithValue }) => {
  try {
    await apiClient.delete(`/mouvements/${id}`, {
      headers: getAuthHeaders(),
    });
    return id;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la suppression du mouvement de stock');
  }
});

// Validation (statut=true)
export const validateMouvementStock = createAsyncThunk<
  MouvementStock,
  string,
  { rejectValue: string }
>('mouvementStock/validate', async (id, { rejectWithValue }) => {
  try {
    const response = await apiClient.patch(`/mouvements/${id}/validate`, {}, {
      headers: getAuthHeaders(),
    });
    // le contrôleur renvoie { message, mouvement }, on renvoie l’objet mouvement
    return (response.data?.mouvement ?? response.data) as MouvementStock;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la validation du mouvement de stock');
  }
});

/* Agrégation générique
   groupBy: 'produit' | 'produit_type'
   + accepte les mêmes filtres que le listing
*/
export const fetchMouvementsAggregate = createAsyncThunk<
  { data: any[]; meta: PaginationMeta },
  { groupBy?: 'produit' | 'produit_type' } & FetchParams,
  { rejectValue: string }
>('mouvementStock/aggregate', async (args, { rejectWithValue }) => {
  try {
    const { groupBy = 'produit', ...params } = args;
    const query = toQueryString({ groupBy, ...params });
    const response = await apiClient.get(`/mouvements/aggregate${query}`, {
      headers: getAuthHeaders(),
    });
    return response.data as { data: any[]; meta: PaginationMeta };
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue("Erreur lors de l'agrégation des mouvements");
  }
});

/* ---------------- Slice ---------------- */

const mouvementStockSlice = createSlice({
  name: 'mouvementStock',
  initialState,
  reducers: {
    setMeta(state, action: PayloadAction<PaginationMeta | null>) {
      state.meta = action.payload;
    },
    clearAggregate(state) {
      state.aggregate = { status: 'idle', error: null, data: [], meta: null };
    },
  },
  extraReducers: (builder) => {
    builder
      /* Listing */
      .addCase(fetchMouvementsStock.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMouvementsStock.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { data, meta } = action.payload;
        mouvementStockAdapter.setAll(state, data ?? []);
        state.meta = meta ?? null;
      })
      .addCase(fetchMouvementsStock.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* Search */
      .addCase(searchMouvementsStock.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(searchMouvementsStock.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { data, meta } = action.payload;
        mouvementStockAdapter.setAll(state, data ?? []);
        state.meta = meta ?? null;
      })
      .addCase(searchMouvementsStock.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* Détail */
      .addCase(fetchMouvementStockById.fulfilled, (state, action) => {
        mouvementStockAdapter.upsertOne(state, action.payload);
      })
      .addCase(fetchMouvementStockById.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* Create */
      .addCase(createMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.addOne(state, action.payload);
        if (state.meta) {
          state.meta.total += 1;
          state.meta.totalPages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
        }
      })
      .addCase(createMouvementStock.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de la création';
      })

      /* Update */
      .addCase(updateMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.upsertOne(state, action.payload);
      })
      .addCase(updateMouvementStock.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de la mise à jour';
      })

      /* Validate */
      .addCase(validateMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.upsertOne(state, action.payload);
      })
      .addCase(validateMouvementStock.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de la validation';
      })

      /* Delete */
      .addCase(deleteMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.removeOne(state, action.payload);
        if (state.meta) {
          state.meta.total = Math.max(0, state.meta.total - 1);
          state.meta.totalPages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
        }
      })
      .addCase(deleteMouvementStock.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de la suppression';
      })

      /* Aggregate */
      .addCase(fetchMouvementsAggregate.pending, (state) => {
        state.aggregate.status = 'loading';
        state.aggregate.error = null;
      })
      .addCase(fetchMouvementsAggregate.fulfilled, (state, action) => {
        state.aggregate.status = 'succeeded';
        state.aggregate.data = action.payload.data ?? [];
        state.aggregate.meta = action.payload.meta ?? null;
      })
      .addCase(fetchMouvementsAggregate.rejected, (state, action) => {
        state.aggregate.status = 'failed';
        state.aggregate.error = (action.payload as string) ?? 'Erreur inconnue';
      });
  },
});

export const { setMeta, clearAggregate } = mouvementStockSlice.actions;
export const mouvementStockReducer = mouvementStockSlice.reducer;

/* ---------------- Selectors ---------------- */
export const {
  selectAll: selectAllMouvementsStock,
  selectById: selectMouvementStockById,
  selectEntities: selectMouvementStockEntities,
  selectIds: selectMouvementStockIds,
  selectTotal: selectTotalMouvementsStock,
} = mouvementStockAdapter.getSelectors<RootState>((state) => state.mouvementStock);

export const selectMouvementStockStatus = (state: RootState) => state.mouvementStock.status;
export const selectMouvementStockError = (state: RootState) => state.mouvementStock.error;
export const selectMouvementStockMeta = (state: RootState) => state.mouvementStock.meta;

// Agrégation
export const selectMouvementAggregate = (state: RootState) => state.mouvementStock.aggregate;
