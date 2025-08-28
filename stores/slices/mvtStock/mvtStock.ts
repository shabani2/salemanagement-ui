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
  page: number; // 1-based
  limit: number;
  total: number;
  skip: number; // offset calculé (=(page-1)*limit si non fourni)
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface FetchParams {
  // pagination & tri
  page?: number; // 1-based
  limit?: number;
  sortBy?: string;
  order?: Order;
  includeTotal?: boolean;
  includeRefs?: boolean;

  // recherche texte (le back peut l’ignorer; on filtre alors côté client)
  q?: string;

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

  // 💡 Si vrai, on tente les routes paginées serveur (/mouvements/page, /by-.../page)
  preferServerPage?: boolean;
}

interface MouvementListResponse<T = MouvementStock> {
  data: T[];
  meta?:
    | (Partial<PaginationMeta> & {
        page?: number;
        limit?: number;
        skip?: number;
        total?: number;
        sortBy?: string;
        order?: Order;
        q?: string;
        totalPages?: number;
        pages?: number; // compat
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
  sortComparer: false,
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
  const page = Math.max(1, Number(raw.page ?? 1));
  const limit = Math.max(1, Number(raw.limit ?? 10));
  const total = Math.max(0, Number(raw.total ?? 0));
  const skip = Number.isFinite(Number(raw?.skip))
    ? Math.max(0, Number(raw?.skip))
    : (page - 1) * limit;
  const totalPages = Number.isFinite(Number(raw?.totalPages))
    ? Math.max(1, Number(raw?.totalPages))
    : Number.isFinite(Number((raw as any)?.pages))
      ? Math.max(1, Number((raw as any)?.pages))
      : Math.max(1, Math.ceil(total / limit));

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

/* ------------- Helpers pour fallback filtre/tri/pagination client ------------- */

function getValByPath(obj: any, path: string) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}

function toStr(v: unknown) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function applyClientFiltersSort(list: MouvementStock[], params: FetchParams) {
  const { q, sortBy, order = 'desc' } = params;

  // 1) filtre texte (produit.nom, type, user.nom, pointVente.nom, region.nom)
  let filtered = list;
  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    filtered = list.filter((m) => {
      const produitNom = getValByPath(m, 'produit.nom');
      const type = getValByPath(m, 'type');
      const userNom = getValByPath(m, 'user.nom');
      const pvNom = getValByPath(m, 'pointVente.nom');
      const regNom = getValByPath(m, 'region.nom');
      return [produitNom, type, userNom, pvNom, regNom].some((v) =>
        toStr(v).toLowerCase().includes(needle)
      );
    });
  }

  // 2) tri
  if (sortBy) {
    const desc = order === 'desc' ? -1 : 1;
    filtered = [...filtered].sort((a, b) => {
      const av = getValByPath(a, sortBy);
      const bv = getValByPath(b, sortBy);

      // dates
      if (sortBy.toLowerCase().includes('date')) {
        const ad = av ? new Date(av).getTime() : 0;
        const bd = bv ? new Date(bv).getTime() : 0;
        return (ad - bd) * desc;
      }

      // num
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * desc;
      }

      // string/object -> string
      return toStr(av).localeCompare(toStr(bv)) * desc;
    });
  }

  return filtered;
}

/** Normalise n’importe quel payload liste en { list, meta } (1-based) */
function normalizeListPayload(
  payload: unknown,
  argPage?: number,
  argLimit?: number,
  argParams?: FetchParams
): { list: MouvementStock[]; meta: PaginationMeta } {
  const page = Math.max(1, argPage ?? 1);
  const limit = Math.max(1, argLimit ?? 10);

  // 💚 Format paginé serveur: { total, page, pages, limit, mouvements }
  if (payload && typeof payload === 'object' && 'mouvements' in payload) {
    const p: any = payload;
    const list: MouvementStock[] = Array.isArray(p.mouvements) ? p.mouvements : [];
    const total = Number(p.total ?? list.length);
    const totalPages = Number(p.pages ?? Math.max(1, Math.ceil(total / limit)));
    const skip = (page - 1) * limit;
    return {
      list, // déjà découpé par le serveur
      meta: { page, limit, total, totalPages, skip, hasPrev: page > 1, hasNext: page < totalPages },
    };
  }

  // Tableau brut -> fallback client
  if (Array.isArray(payload)) {
    const raw = payload as MouvementStock[];
    const filteredSorted = applyClientFiltersSort(raw, argParams ?? {});
    const total = filteredSorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const slice = filteredSorted.slice(skip, skip + limit);

    return {
      list: slice,
      meta: { page, limit, total, totalPages, skip, hasPrev: page > 1, hasNext: page < totalPages },
    };
  }

  // { data, meta? }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const obj = payload as MouvementListResponse<MouvementStock>;
    const baseList = Array.isArray(obj.data) ? obj.data : [];
    const filteredSorted = applyClientFiltersSort(baseList, argParams ?? {});
    const m = normalizeMeta(obj.meta) ?? {
      page,
      limit,
      total: filteredSorted.length,
      totalPages: Math.max(1, Math.ceil(filteredSorted.length / limit)),
      skip: (page - 1) * limit,
      hasPrev: page > 1,
      hasNext: page < Math.max(1, Math.ceil(filteredSorted.length / limit)),
    };
    const fixedSkip = Number.isFinite(m.skip) ? (m.skip as number) : (m.page - 1) * m.limit;
    const slice = filteredSorted.slice(fixedSkip, fixedSkip + m.limit);
    return { list: slice, meta: { ...m, skip: fixedSkip } };
  }

  // mongoose-paginate: { docs, totalDocs, page, limit, totalPages, ... }
  if (payload && typeof payload === 'object' && 'docs' in payload) {
    const p: any = payload;
    const base = Array.isArray(p.docs) ? p.docs : [];
    const filteredSorted = applyClientFiltersSort(base, argParams ?? {});
    const pg = Number(p.page ?? page);
    const lm = Number(p.limit ?? limit);
    const total = Number(p.totalDocs ?? p.total ?? filteredSorted.length);
    const totalPages = Number(p.totalPages ?? Math.max(1, Math.ceil(total / lm)));
    const skip = Number.isFinite(Number(p.offset)) ? Number(p.offset) : (pg - 1) * lm;
    const slice = filteredSorted.slice(skip, skip + lm);
    return {
      list: slice,
      meta: {
        page: pg,
        limit: lm,
        total,
        totalPages,
        skip,
        hasPrev: pg > 1,
        hasNext: pg < totalPages,
      },
    };
  }

  // { items, total, page/limit/skip }
  if (payload && typeof payload === 'object' && 'items' in payload) {
    const p: any = payload;
    const base = Array.isArray(p.items) ? p.items : [];
    const filteredSorted = applyClientFiltersSort(base, argParams ?? {});
    const lm = Number(p.limit ?? limit);
    const pg = Number(p.page ?? page);
    const total = Number(p.total ?? filteredSorted.length);
    const totalPages = Math.max(1, Math.ceil(total / lm));
    const skip = Number.isFinite(Number(p.skip)) ? Number(p.skip) : (pg - 1) * lm;
    const slice = filteredSorted.slice(skip, skip + lm);
    return {
      list: slice,
      meta: {
        page: pg,
        limit: lm,
        total,
        totalPages,
        skip,
        hasPrev: pg > 1,
        hasNext: pg < totalPages,
      },
    };
  }

  // Fallback
  const skip = (page - 1) * limit;
  return {
    list: [],
    meta: { page, limit, total: 0, totalPages: 1, skip, hasPrev: false, hasNext: false },
  };
}

/* ---------------- Thunks (API /mouvements) ---------------- */

// Essaie d’utiliser les routes paginées serveur si preferServerPage=true, sinon /mouvements
async function fetchMouvementsApi(params: FetchParams) {
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
    preferServerPage = true,
  } = params;

  // 1) tente une route paginée si demandée
  if (preferServerPage) {
    // on devine les routes côté serveur d’après le contrôleur fourni
    let serverUrl: string | null = null;
    if (pointVente) {
      serverUrl = `/mouvements/by-point-vente/${pointVente}/page`;
    } else if (region) {
      // version optimisée paginée
      serverUrl = `/mouvements/region/${region}/page`;
    } else if (user) {
      serverUrl = `/mouvements/byUser/${user}`;
      // ce contrôleur est déjà paginé d’après le code fourni
    } else {
      serverUrl = `/mouvements/page`;
    }

    const query = toQueryString({
      page,
      limit,
      q,
      sortBy,
      order,
      includeTotal,
      includeRefs,
      produit,
      type,
      statut,
      depotCentral,
      dateFrom,
      dateTo,
    });

    try {
      const res = await apiClient.get(`${serverUrl}${query}`, { headers: getAuthHeaders() });
      return res.data; // { total, page, pages, limit, mouvements } attendu
    } catch (e) {
      // on tombera sur le fallback ci-dessous
    }
  }

  // 2) fallback: route non paginée -> retourne un tableau complet
  const query = toQueryString({
    // le back ignorera la plupart de ces params; on les utilisera côté client
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

  const res2 = await apiClient.get(`/mouvements${query}`, { headers: getAuthHeaders() });
  return res2.data; // Array<MouvementStock> la plupart du temps
}

// Liste paginée/triée/filtrée
export const fetchMouvementsStock = createAsyncThunk<
  unknown, // shape libre (normalisé dans le reducer)
  FetchParams | undefined,
  { rejectValue: string }
>('mouvementStock/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await fetchMouvementsApi(params ?? {});
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération des mouvements de stock');
  }
});

// Recherche (idem, on laisse le back répondre librement; fallback client si array)
export const searchMouvementsStock = createAsyncThunk<
  unknown,
  FetchParams & { q: string },
  { rejectValue: string }
>('mouvementStock/search', async (params, { rejectWithValue }) => {
  try {
    // on tente aussi les routes paginées si preferServerPage
    return await fetchMouvementsApi(params);
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
    const response = await apiClient.post('/mouvements', data, { headers: getAuthHeaders() });
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
      await apiClient.delete(`/mouvements/${id}`, { headers: getAuthHeaders() });
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
    const response = await apiClient.put(
      `/mouvements/validate/${id}`,
      {},
      { headers: getAuthHeaders() }
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
    const query = toQueryString({ groupBy, ...params });
    const response = await apiClient.get(`/mouvements/aggregate${query}`, {
      headers: getAuthHeaders(),
    });
    const meta = normalizeMeta(response.data?.meta) as PaginationMeta;
    return { data: response.data?.data ?? [], meta };
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue("Erreur lors de l'agrégation des mouvements");
  }
});

interface FetchMvtStockParams {
  pointVenteId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}
export const fetchMouvementStockAggregatedByPointVente = async ({
  pointVenteId,
  page = 1,
  limit = 10,
  sortBy = 'updatedAt',
  order = 'desc',
}: FetchMvtStockParams) => {
  if (!pointVenteId) {
    throw new Error('pointVenteId est requis');
  }

  const response = await apiClient.get(`/mvtstock/pointvente/${pointVenteId}`, {
    params: {
      page,
      limit,
      sortBy,
      order,
    },
  });

  return response.data;
};

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
        const params = (action.meta.arg ?? {}) as FetchParams;
        const { list, meta } = normalizeListPayload(
          action.payload,
          params.page,
          params.limit,
          params
        );
        mouvementStockAdapter.setAll(state, list ?? []);
        state.meta = meta;
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
        const params = (action.meta.arg ?? {}) as FetchParams;
        const { list, meta } = normalizeListPayload(
          action.payload,
          params.page,
          params.limit,
          params
        );
        // on reflète la grille filtrée
        mouvementStockAdapter.setAll(state, list ?? []);
        state.meta = meta;
      })
      .addCase(searchMouvementsStock.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* Détail / CRUD */
      .addCase(fetchMouvementStockById.fulfilled, (state, action) => {
        mouvementStockAdapter.upsertOne(state, action.payload);
      })
      .addCase(fetchMouvementStockById.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

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

      .addCase(updateMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.upsertOne(state, action.payload);
      })
      .addCase(updateMouvementStock.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de la mise à jour';
      })

      .addCase(validateMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.upsertOne(state, action.payload);
      })
      .addCase(validateMouvementStock.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de la validation';
      })

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
