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
import { MouvementStock } from '@/Models/mouvementStockType';

/* ---------------- Types génériques (pagination / tri / filtres) ---------------- */

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';
export type Order = 'asc' | 'desc';

export interface PaginationMeta {
  page: number; // 1-based (avec page1=true côté back)
  limit: number;
  total: number;
  skip: number; // offset réel renvoyé par le back
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface FetchParams {
  page?: number; // 1-based
  limit?: number;
  q?: string;
  sortBy?: string;
  order?: Order;
  includeTotal?: boolean;
  includeRefs?: boolean;
  // astuce pour forcer le back à traiter page en 1-based
  page1?: boolean;

  // Filtres
  region?: string;
  pointVente?: string;
  user?: string;
  produit?: string;
  type?: string;
  statut?: boolean;
  depotCentral?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

interface MouvementListResponse<T = MouvementStock> {
  data: T[];
  // meta du back: { page, limit, skip, total, sortBy, order, q }
  meta?:
    | (Partial<PaginationMeta> & {
        page?: number;
        limit?: number;
        skip?: number;
        total?: number;
        sortBy?: string;
        order?: Order;
        q?: string;
      })
    | null;
}

/* ---------------- State ---------------- */

interface MouvementStockStateExtra {
  status: Status;
  error: string | null;
  meta: PaginationMeta | null;
  aggregate: {
    status: Status;
    error: string | null;
    data: any[];
    meta: PaginationMeta | null;
  };
}

const mouvementStockAdapter: EntityAdapter<MouvementStock, string> = createEntityAdapter<
  MouvementStock,
  string
>({
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

const normalizeMeta = (raw?: MouvementListResponse['meta'] | null): PaginationMeta | null => {
  if (!raw) return null;
  const page = Math.max(1, Number(raw.page || 1)); // 1-based (car page1=true côté client)
  const limit = Math.max(1, Number(raw.limit || 10));
  const total = Math.max(0, Number(raw.total || 0));
  const skip = Math.max(0, Number(raw.skip || 0));
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    skip,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
};

/* ---------------- Thunks (API /mouvements) ---------------- */

// Liste paginée/triée/filtrée (1-based)
export const fetchMouvementsStock = createAsyncThunk<
  MouvementListResponse<MouvementStock>,
  FetchParams | undefined,
  { rejectValue: string }
>('mouvementStock/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const {
      page = 0,
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
      // toujours vrai pour mode 1-based
      page1 = true,
    } = params || {};

    const query = toQueryString({
      page,
      page1,
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

// Recherche (mêmes params, 1-based)
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
      page1 = true,
    } = params;

    const query = toQueryString({
      page,
      page1,
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
export const deleteMouvementStock = createAsyncThunk<string, string, { rejectValue: string }>(
  'mouvementStock/delete',
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/mouvements/${id}`, {
        headers: getAuthHeaders(),
      });
      return id;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la suppression du mouvement de stock');
    }
  }
);

// Validation (statut=true)
export const validateMouvementStock = createAsyncThunk<
  MouvementStock,
  string,
  { rejectValue: string }
>('mouvementStock/validate', async (id, { rejectWithValue }) => {
  try {
    const response = await apiClient.patch(
      `/mouvements/${id}/validate`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );
    return (response.data?.mouvement ?? response.data) as MouvementStock;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la validation du mouvement de stock');
  }
});

/* Agrégation générique (optionnel) */
export const fetchMouvementsAggregate = createAsyncThunk<
  { data: any[]; meta: PaginationMeta },
  { groupBy?: 'produit' | 'produit_type' } & FetchParams,
  { rejectValue: string }
>('mouvementStock/aggregate', async (args, { rejectWithValue }) => {
  try {
    const { groupBy = 'produit', ...params } = args;
    const query = toQueryString({ groupBy, ...params, page1: true });
    const response = await apiClient.get(`/mouvements/aggregate${query}`, {
      headers: getAuthHeaders(),
    });
    // si le back renvoie page/limit/total/skip, on normalise pareil
    const meta = normalizeMeta(response.data?.meta) as PaginationMeta;
    return { data: response.data?.data ?? [], meta };
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue("Erreur lors de l'agrégation des mouvements");
  }
});



// 2. Agrégation par point de vente (total par produit/type)
export const fetchMouvementStockAggregatedByPointVente = createAsyncThunk(
  'mouvementStock/fetchAggregatedByPointVente',
  async (
    { pointVenteId, page = 1 }: { pointVenteId: string; page?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.get(
        `/mouvementStock/by-point-vente/aggregate/${pointVenteId}?page=${page}`,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Erreur lors de l'agrégation des mouvements");
    }
  }
);



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
        state.meta = normalizeMeta(meta);
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
        state.meta = normalizeMeta(meta);
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
          state.meta.hasNext = state.meta.page < state.meta.totalPages;
          state.meta.hasPrev = state.meta.page > 1;
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
          state.meta.hasNext = state.meta.page < state.meta.totalPages;
          state.meta.hasPrev = state.meta.page > 1;
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
