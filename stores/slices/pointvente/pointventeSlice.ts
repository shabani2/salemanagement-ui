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
import { PointVente, PointVenteModel } from '@/Models/pointVenteType';

/* ---------------- Types pagination & requêtes ---------------- */
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
  region?: string; // ObjectId de la région
  sortBy?: string; // ex: 'createdAt' | 'nom' | 'region.nom'
  order?: Order; // 'asc' | 'desc'
  includeTotal?: boolean; // par défaut true
  includeStock?: boolean; // pour peupler stock.produit au besoin
}

interface PointVenteListResponse<T = PointVente> {
  data: T[];
  meta?: Partial<PaginationMeta>;
}

/* --------- Étend ton type si tu veux exploiter stockCount côté UI --------- */
type PointVenteWithExtras = PointVente & { stockCount?: number };

/* ---------------- State ---------------- */
interface PointVenteStateExtra {
  status: Status;
  error: string | null;
  meta: PaginationMeta | null;
}

const pointVenteAdapter: EntityAdapter<PointVenteWithExtras, string> = createEntityAdapter<
  PointVenteWithExtras,
  string
>({
  selectId: (pv) => pv._id,
  sortComparer: false, // tri géré par le backend
});

const initialState = pointVenteAdapter.getInitialState<PointVenteStateExtra>({
  status: 'idle',
  error: null,
  meta: null,
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

/** Normalise n’importe quel shape de payload reçu en { list, meta } */
function normalizeListPayload(
  payload: unknown,
  argPage?: number,
  argLimit?: number
): { list: PointVenteWithExtras[]; meta: PaginationMeta | null } {
  // 1) Tableau brut
  if (Array.isArray(payload)) {
    const page = argPage ?? 1;
    const limit = argLimit ?? (payload.length || 10);
    const total = payload.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      list: payload as PointVenteWithExtras[],
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    };
  }

  // 2) { data, meta? }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const obj = payload as { data: unknown; meta?: Partial<PaginationMeta> };
    const list = Array.isArray(obj.data) ? (obj.data as PointVenteWithExtras[]) : [];
    const page = (obj.meta?.page ?? argPage ?? 1) as number;
    const limit = (obj.meta?.limit ?? argLimit ?? (list.length || 10)) as number;
    const total = (obj.meta?.total ?? list.length) as number;
    const totalPages =
      (obj.meta?.totalPages as number | undefined) ?? Math.max(1, Math.ceil(total / limit));
    const hasPrev = (obj.meta?.hasPrev as boolean | undefined) ?? page > 1;
    const hasNext = (obj.meta?.hasNext as boolean | undefined) ?? page < totalPages;
    return {
      list,
      meta: { page, limit, total, totalPages, hasPrev, hasNext },
    };
  }

  // 3) Mongoose paginate-like: { docs, totalDocs, page, limit, totalPages, hasPrevPage, hasNextPage }
  if (payload && typeof payload === 'object' && 'docs' in payload) {
    const p: any = payload;
    const list: PointVenteWithExtras[] = Array.isArray(p.docs) ? p.docs : [];
    const page = Number(p.page ?? argPage ?? 1);
    const limit = Number(p.limit ?? argLimit ?? (list.length || 10));
    const total = Number(p.totalDocs ?? p.total ?? list.length);
    const totalPages = Number(p.totalPages ?? Math.max(1, Math.ceil(total / limit)));
    const hasPrev = Boolean(p.hasPrevPage ?? page > 1);
    const hasNext = Boolean(p.hasNextPage ?? page < totalPages);
    return { list, meta: { page, limit, total, totalPages, hasPrev, hasNext } };
  }

  // 4) { items, total, page, limit } ou autres variantes
  if (payload && typeof payload === 'object' && 'items' in payload) {
    const p: any = payload;
    const list: PointVenteWithExtras[] = Array.isArray(p.items) ? p.items : [];
    const page = Number(p.page ?? argPage ?? 1);
    const limit = Number(p.limit ?? argLimit ?? (list.length || 10));
    const total = Number(p.total ?? list.length);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      list,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    };
  }

  // Fallback : rien d’exploitable → vide
  return {
    list: [],
    meta: {
      page: argPage ?? 1,
      limit: argLimit ?? 10,
      total: 0,
      totalPages: 1,
      hasPrev: false,
      hasNext: false,
    },
  };
}

/* ---------------- Thunks ---------------- */

// Liste paginée / triée / filtrée
export const fetchPointVentes = createAsyncThunk<
  unknown, // ⬅️ on laisse "unknown" pour accepter tous les shapes; normalisation dans reducer
  FetchParams | undefined,
  { rejectValue: string }
>('pointVentes/fetchPointVentes', async (params, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      region,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
      includeStock = false,
    } = params || {};

    const query = toQueryString({
      page,
      limit,
      q,
      region,
      sortBy,
      order,
      includeTotal,
      includeStock,
    });

    const res = await apiClient.get(`/pointventes${query}`, {
      headers: getAuthHeaders(),
    });
    return res.data; // shape libre : [] | {data, meta} | {docs,...}
  } catch (err: unknown) {
    if (err instanceof Error) return rejectWithValue(err.message);
    return rejectWithValue('Erreur lors de la récupération des points de vente');
  }
});

// Recherche paginée (mêmes params)
export const searchPointVentes = createAsyncThunk<
  unknown,
  FetchParams & { q: string },
  { rejectValue: string }
>('pointVentes/searchPointVentes', async (params, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      region,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
      includeStock = false,
    } = params;

    const query = toQueryString({
      page,
      limit,
      q,
      region,
      sortBy,
      order,
      includeTotal,
      includeStock,
    });

    const res = await apiClient.get(`/pointventes/search${query}`, {
      headers: getAuthHeaders(),
    });
    return res.data;
  } catch (err: unknown) {
    if (err instanceof Error) return rejectWithValue(err.message);
    return rejectWithValue('Erreur lors de la recherche des points de vente');
  }
});

// Liste par région
export const fetchPointVentesByRegionId = createAsyncThunk<
  unknown,
  { regionId: string } & Omit<FetchParams, 'region'>,
  { rejectValue: string }
>('pointVentes/fetchPointVentesByRegionId', async ({ regionId, ...params }, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
      includeStock = false,
    } = params;

    const query = toQueryString({
      page,
      limit,
      q,
      sortBy,
      order,
      includeTotal,
      includeStock,
    });

    const res = await apiClient.get(`/pointventes/region/${regionId}${query}`, {
      headers: getAuthHeaders(),
    });
    return res.data;
  } catch (err: unknown) {
    if (err instanceof Error) return rejectWithValue(err.message);
    return rejectWithValue('Erreur lors du chargement par région');
  }
});

// Détail (includeStock optionnel)
export const fetchPointVenteById = createAsyncThunk<
  PointVenteWithExtras,
  { id: string; includeStock?: boolean },
  { rejectValue: string }
>('pointVentes/fetchPointVenteById', async ({ id, includeStock = true }, { rejectWithValue }) => {
  try {
    const query = toQueryString({ includeStock });
    const res = await apiClient.get(`/pointventes/${id}${query}`, {
      headers: getAuthHeaders(),
    });
    return res.data as PointVenteWithExtras;
  } catch (err: unknown) {
    if (err instanceof Error) return rejectWithValue(err.message);
    return rejectWithValue('Erreur lors de la récupération du point de vente');
  }
});

// Création
export const addPointVente = createAsyncThunk<
  PointVenteWithExtras,
  PointVenteModel,
  { rejectValue: string }
>('pointVentes/addPointVente', async (pointVente, { rejectWithValue }) => {
  try {
    const res = await apiClient.post('/pointventes', pointVente, {
      headers: getAuthHeaders(),
    });
    return res.data as PointVenteWithExtras;
  } catch (err: unknown) {
    if (err instanceof Error) return rejectWithValue(err.message);
    return rejectWithValue('Erreur lors de l’ajout du point de vente');
  }
});

// Mise à jour
export const updatePointVente = createAsyncThunk<
  PointVenteWithExtras,
  { id: string; updateData: Partial<PointVente> },
  { rejectValue: string }
>('pointVentes/updatePointVente', async ({ id, updateData }, { rejectWithValue }) => {
  try {
    const res = await apiClient.put(`/pointventes/${id}`, updateData, {
      headers: getAuthHeaders(),
    });
    return res.data as PointVenteWithExtras;
  } catch (err: unknown) {
    if (err instanceof Error) return rejectWithValue(err.message);
    return rejectWithValue('Erreur lors de la mise à jour du point de vente');
  }
});

// Suppression
export const deletePointVente = createAsyncThunk<string, string, { rejectValue: string }>(
  'pointVentes/deletePointVente',
  async (pointVenteId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/pointventes/${pointVenteId}`, {
        headers: getAuthHeaders(),
      });
      return pointVenteId;
    } catch (err: unknown) {
      if (err instanceof Error) return rejectWithValue(err.message);
      return rejectWithValue('Erreur lors de la suppression du point de vente');
    }
  }
);

/* ---------------- Slice ---------------- */
const pointVenteSlice = createSlice({
  name: 'pointVentes',
  initialState,
  reducers: {
    setMeta(state, action: PayloadAction<PaginationMeta | null>) {
      state.meta = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      /* fetchPointVentes */
      .addCase(fetchPointVentes.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPointVentes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Normalise le payload quel que soit son shape
        const params = action.meta.arg ?? {};
        const { list, meta } = normalizeListPayload(
          action.payload,
          params.page,
          params.limit
        );
        pointVenteAdapter.setAll(state, list ?? []);
        state.meta = meta;
      })
      .addCase(fetchPointVentes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* searchPointVentes */
      .addCase(searchPointVentes.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(searchPointVentes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const params = action.meta.arg ?? {};
        const { list, meta } = normalizeListPayload(
          action.payload,
          params.page,
          params.limit
        );
        pointVenteAdapter.setAll(state, list ?? []);
        state.meta = meta;
      })
      .addCase(searchPointVentes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* fetchPointVentesByRegionId */
      .addCase(fetchPointVentesByRegionId.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPointVentesByRegionId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const params = action.meta.arg ?? {};
        const { list, meta } = normalizeListPayload(
          action.payload,
          params.page,
          params.limit
        );
        pointVenteAdapter.setAll(state, list ?? []);
        state.meta = meta;
      })
      .addCase(fetchPointVentesByRegionId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* fetchPointVenteById */
      .addCase(fetchPointVenteById.fulfilled, (state, action) => {
        pointVenteAdapter.upsertOne(state, action.payload);
      })
      .addCase(fetchPointVenteById.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* addPointVente */
      .addCase(addPointVente.fulfilled, (state, action) => {
        pointVenteAdapter.addOne(state, action.payload);
        if (state.meta) {
          state.meta.total += 1;
          state.meta.totalPages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
          // hasNext/hasPrev ne sont pas recalculés ici (ils dépendent de la page courante côté UI)
        }
      })
      .addCase(addPointVente.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de l’ajout';
      })

      /* updatePointVente */
      .addCase(updatePointVente.fulfilled, (state, action) => {
        pointVenteAdapter.upsertOne(state, action.payload);
      })
      .addCase(updatePointVente.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de la mise à jour';
      })

      /* deletePointVente */
      .addCase(deletePointVente.fulfilled, (state, action) => {
        pointVenteAdapter.removeOne(state, action.payload);
        if (state.meta) {
          state.meta.total = Math.max(0, state.meta.total - 1);
          state.meta.totalPages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
        }
      })
      .addCase(deletePointVente.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de la suppression';
      });
  },
});

export const { setMeta } = pointVenteSlice.actions;
export const pointVenteReducer = pointVenteSlice.reducer;

/* ---------------- Selectors ---------------- */
export const {
  selectAll: selectAllPointVentes,
  selectById: selectPointVenteById,
  selectEntities: selectPointVenteEntities,
  selectIds: selectPointVenteIds,
  selectTotal: selectTotalPointVentes,
} = pointVenteAdapter.getSelectors<RootState>((state) => state.pointVentes);

export const selectPointVenteStatus = (state: RootState) => state.pointVentes.status;
export const selectPointVenteError = (state: RootState) => state.pointVentes.error;
export const selectPointVenteMeta = (state: RootState) => state.pointVentes.meta;
