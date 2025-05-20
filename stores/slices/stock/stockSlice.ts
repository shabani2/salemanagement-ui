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

interface StockState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const stockAdapter: EntityAdapter<Stock, string> = createEntityAdapter<Stock, string>({
  selectId: (stock) => stock._id,
});

const initialState = stockAdapter.getInitialState<StockState>({
  status: 'idle',
  error: null,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchStocks = createAsyncThunk('stock/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const response = await apiClient.get('/stock', {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération des stocks');
  }
});
export const fetchStockByPointVenteId = createAsyncThunk(
  'Stock/fetchStockBypointVenteId',
  async (pointVenteId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/stock/stock-by-pv/${pointVenteId}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération du mouvement de stock');
    }
  }
);

export const fetchStockById = createAsyncThunk(
  'stock/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/stock/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la récupération du stock');
    }
  }
);

export const createStock = createAsyncThunk(
  'stock/create',
  async (data: Omit<Stock, '_id'>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/stock', data, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la création du stock');
    }
  }
);

export const updateStock = createAsyncThunk(
  'stock/update',
  async (data: { _id: string; [key: string]: any }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/stock/${data._id}`, data, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la mise à jour du stock');
    }
  }
);

export const deleteStock = createAsyncThunk(
  'stock/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/stock/${id}`, {
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
  'stock/checkStock',
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
        '/stock/check',
        { ...params },
        { headers: getAuthHeaders() }
      );
      return response.data; // { success: true, disponible: number }
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la vérification du stock');
    }
  }
);

const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStocks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        stockAdapter.setAll(state, action.payload);
        fetchStockByPointVenteId;
      })
      .addCase(fetchStocks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(createStock.fulfilled, (state, action) => {
        stockAdapter.addOne(state, action.payload);
      })
      .addCase(fetchStockById.fulfilled, (state, action) => {
        stockAdapter.upsertOne(state, action.payload);
      })
      .addCase(updateStock.fulfilled, (state, action) => {
        stockAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteStock.fulfilled, (state, action) => {
        stockAdapter.removeOne(state, action.payload);
      })
      .addCase(fetchStockByPointVenteId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        stockAdapter.setAll(state, action.payload);
      })
      .addCase(fetchStockByPointVenteId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

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
