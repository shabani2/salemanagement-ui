/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  EntityAdapter,
} from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import { Stock } from '@/Models/stock';
import { PointVente } from '@/Models/pointVenteType';

/* ----------------------------- Types état/meta ----------------------------- */

interface ListMeta {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

interface StockState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  meta: ListMeta;
}

type FetchStocksParams = {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: string;               // ex: "createdAt" ou "produit.nom"
  order?: 'asc' | 'desc';
  pointVente?: string;
  region?: string;
  produit?: string;
  depotCentral?: boolean;
  includeTotal?: boolean;        // par défaut true
  includeRefs?: boolean;         // par défaut true
};

/* -------------------------------- Adapter --------------------------------- */

const stockAdapter: EntityAdapter<Stock, string> =
  createEntityAdapter<Stock, string>({
    selectId: (stock) => stock._id,
  });

const initialState = stockAdapter.getInitialState<StockState>({
  status: 'idle',
  error: null,
  meta: { total: 0, page: 1, pages: 0, limit: 10 },
});

/* ------------------------------- Helpers ---------------------------------- */

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token-agricap')
    : null;
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

/* -------------------------------- Thunks ---------------------------------- */

/**
 * GET /stocks avec pagination/tri/recherche/filtres
 * Retour attendu: { data: Stock[], meta: { total, page, pages, limit } }
 * (Tolère aussi un tableau simple si l'API n'a pas encore été migrée)
 */
export const fetchStocks = createAsyncThunk(
  'stocks/fetchAll',
  async (params: FetchStocksParams | undefined, { rejectWithValue }) => {
    try {
      const query = toQueryString({
        includeTotal: true,
        includeRefs: true,
        ...params,
      });
      const response = await apiClient.get(`/stocks${query}`, {
        headers: getAuthHeaders(),
      });
      const payload = response.data;

      // Mode rétro-compat si l’API renvoie un tableau brut
      if (Array.isArray(payload)) {
        return { data: payload, meta: { total: payload.length, page: 1, pages: 1, limit: payload.length || 10 } };
      }
      // Sinon on attend { data, meta }
      return {
        data: Array.isArray(payload?.data) ? payload.data : [],
        meta: {
          total: Number(payload?.meta?.total ?? 0),
          page: Number(payload?.meta?.page ?? 1),
          pages: Number(payload?.meta?.pages ?? 0),
          limit: Number(payload?.meta?.limit ?? (params?.limit ?? 10)),
        } as ListMeta,
      };
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la récupération des stocks');
    }
  }
);

/** DÉPRÉCIÉS côté UI — utilisent la nouvelle route unique */
export const fetchStockByRegionId = createAsyncThunk(
  'stocks/fetchByRegionId',
  async (regionId: string, { rejectWithValue, dispatch }) => {
    try {
      // délègue au nouveau fetch avec filtres
      const res = await dispatch(fetchStocks({ region: regionId, includeTotal: true, includeRefs: true }) as any);
      // @ts-ignore - on retourne le même shape que fetchStocks
      return res.payload;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la récupération des stocks par région');
    }
  }
);

export const fetchStockByPointVenteId = createAsyncThunk(
  'stocks/fetchByPointVenteId',
  async (pointVenteId: string, { rejectWithValue, dispatch }) => {
    try {
      const res = await dispatch(fetchStocks({ pointVente: pointVenteId, includeTotal: true, includeRefs: true }) as any);
      // @ts-ignore
      return res.payload;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la récupération des stocks par point de vente');
    }
  }
);

export const fetchStockById = createAsyncThunk(
  'stocks/fetchById',
  async (id: string, { rejectWithValue }) => {
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

export const createStock = createAsyncThunk(
  'stocks/create',
  async (data: Omit<Stock, '_id'>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/stocks', data, {
        headers: getAuthHeaders(),
      });
      return response.data as Stock;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la création du stock');
    }
  }
);

export const updateStock = createAsyncThunk(
  'stocks/update',
  async (data: { _id: string; [key: string]: any }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/stocks/${data._id}`, data, {
        headers: getAuthHeaders(),
      });
      return response.data as Stock;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la mise à jour du stock');
    }
  }
);

export const deleteStock = createAsyncThunk(
  'stocks/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/stocks/${id}`, {
        headers: getAuthHeaders(),
      });
      return id;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la suppression du stock');
    }
  }
);

export const checkStock = createAsyncThunk(
  'stocks/checkStock',
  async (
    params: {
      type: string;
      produitId: string;
      quantite: number;
      pointVenteId?: string | undefined | PointVente;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post(
        '/stocks/check',
        { ...params },
        { headers: getAuthHeaders() }
      );
      return response.data; // { success: boolean, quantiteDisponible: number, suffisant: boolean }
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la vérification du stock');
    }
  }
);

/* --------------------------------- Slice ---------------------------------- */

const stockSlice = createSlice({
  name: 'stocks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchStocks
      .addCase(fetchStocks.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchStocks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (Array.isArray((action.payload as any)?.data)) {
          stockAdapter.setAll(state, (action.payload as any).data);
          state.meta = (action.payload as any).meta ?? state.meta;
        } else if (Array.isArray(action.payload)) {
          // rétro-compat: payload = Stock[]
          stockAdapter.setAll(state, action.payload as any);
          state.meta = { total: (action.payload as any).length, page: 1, pages: 1, limit: (action.payload as any).length || 10 };
        } else {
          stockAdapter.setAll(state, []);
          state.meta = { total: 0, page: 1, pages: 0, limit: 10 };
        }
      })
      .addCase(fetchStocks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // compat wrappers
      .addCase(fetchStockByRegionId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if ((action.payload as any)?.data) {
          stockAdapter.setAll(state, (action.payload as any).data);
          state.meta = (action.payload as any).meta ?? state.meta;
        }
      })
      .addCase(fetchStockByPointVenteId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if ((action.payload as any)?.data) {
          stockAdapter.setAll(state, (action.payload as any).data);
          state.meta = (action.payload as any).meta ?? state.meta;
        }
      })

      // byId
      .addCase(fetchStockById.fulfilled, (state, action) => {
        stockAdapter.upsertOne(state, action.payload);
      })

      // create/update/delete
      .addCase(createStock.fulfilled, (state, action) => {
        stockAdapter.addOne(state, action.payload);
      })
      .addCase(updateStock.fulfilled, (state, action) => {
        stockAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteStock.fulfilled, (state, action) => {
        stockAdapter.removeOne(state, action.payload);
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
