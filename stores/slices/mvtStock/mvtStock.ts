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
import { MouvementStock } from '@/Models/mouvementStockType';

interface MouvementStockState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const mouvementStockAdapter: EntityAdapter<MouvementStock, string> = createEntityAdapter<
  MouvementStock,
  string
>({
  selectId: (mouvement) => mouvement._id,
});

const initialState = mouvementStockAdapter.getInitialState<MouvementStockState>({
  status: 'idle',
  error: null,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchMouvementsStock = createAsyncThunk(
  'mouvementStock/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/mouvementStock', {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération des mouvements de stock');
    }
  }
);

export const fetchMouvementStockById = createAsyncThunk(
  'mouvementStock/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/mouvementStock/${id}`, {
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

export const createMouvementStock = createAsyncThunk(
  'mouvementStock/create',
  async (data: Omit<MouvementStock, '_id'>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/mouvementStock', data, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la création du mouvement de stock');
    }
  }
);

export const updateMouvementStock = createAsyncThunk(
  'mouvementStock/update',
  async (data: { _id: string; [key: string]: any }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/mouvementStock/${data._id}`, data, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la mise à jour du mouvement de stock');
    }
  }
);

export const deleteMouvementStock = createAsyncThunk(
  'mouvementStock/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/mouvementStock/${id}`, {
        headers: getAuthHeaders(),
      });
      return id;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la suppression du mouvement de stock');
    }
  }
);

const mouvementStockSlice = createSlice({
  name: 'mouvementStock',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMouvementsStock.fulfilled, (state, action) => {
        state.status = 'succeeded';
        mouvementStockAdapter.setAll(state, action.payload);
      })
      .addCase(fetchMouvementsStock.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(createMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.addOne(state, action.payload);
      })
      .addCase(fetchMouvementStockById.fulfilled, (state, action) => {
        mouvementStockAdapter.upsertOne(state, action.payload);
      })
      .addCase(updateMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.removeOne(state, action.payload);
      });
  },
});

export const mouvementStockReducer = mouvementStockSlice.reducer;

export const {
  selectAll: selectAllMouvementsStock,
  selectById: selectMouvementStockById,
  selectEntities: selectMouvementStockEntities,
  selectIds: selectMouvementStockIds,
  selectTotal: selectTotalMouvementsStock,
} = mouvementStockAdapter.getSelectors<RootState>((state) => state.mouvementStock);

export const selectMouvementStockStatus = (state: RootState) => state.mouvementStock.status;
export const selectMouvementStockError = (state: RootState) => state.mouvementStock.error;
