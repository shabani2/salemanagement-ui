/* eslint-disable @typescript-eslint/no-explicit-any */
// finance/exchangeRateSlice.ts
'use client';

import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import { ExchangeRate } from '@/Models/FinanceModel';

const exchangeRateAdapter = createEntityAdapter<ExchangeRate, string>({
  selectId: (rate) => rate._id,
  sortComparer: (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime(),
});

interface ExchangeRateState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState = exchangeRateAdapter.getInitialState<ExchangeRateState>({
  status: 'idle',
  error: null,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Thunks
export const fetchExchangeRates = createAsyncThunk(
  'exchangeRates/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/finance/exchange-rates', {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors du chargement des taux de change'
      );
    }
  }
);

export const addExchangeRate = createAsyncThunk(
  'exchangeRates/add',
  async (rate: Omit<ExchangeRate, '_id'>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/finance/exchange-rates', rate, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors de l'ajout du taux de change"
      );
    }
  }
);

export const deleteExchangeRate = createAsyncThunk(
  'exchangeRates/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/finance/exchange-rates/${id}`, {
        headers: getAuthHeaders(),
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la suppression du taux de change'
      );
    }
  }
);

const exchangeRateSlice = createSlice({
  name: 'exchangeRates',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExchangeRates.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchExchangeRates.fulfilled, (state, action) => {
        state.status = 'succeeded';
        exchangeRateAdapter.setAll(state, action.payload);
      })
      .addCase(fetchExchangeRates.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(addExchangeRate.fulfilled, exchangeRateAdapter.addOne)
      .addCase(deleteExchangeRate.fulfilled, exchangeRateAdapter.removeOne);
  },
});

export const exchangeRateReducer = exchangeRateSlice.reducer;

// Sélecteurs
export const { selectAll: selectAllExchangeRates, selectById: selectExchangeRateById } =
  exchangeRateAdapter.getSelectors<RootState>((state) => state.exchangeRates);

export const selectExchangeRateStatus = (state: RootState) => state.exchangeRates.status;
export const selectExchangeRateError = (state: RootState) => state.exchangeRates.error;
