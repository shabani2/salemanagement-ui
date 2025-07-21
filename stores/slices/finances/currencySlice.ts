// finance/currencySlice.ts
'use client';

import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import { Currency } from '@/Models/FinanceModel';

// Adapter pour les devises
const currencyAdapter = createEntityAdapter<Currency, string>({
  selectId: (currency) => currency._id,
  sortComparer: (a, b) => a.code.localeCompare(b.code),
});

interface CurrencyState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  baseCurrency: Currency | null;
}

const initialState = currencyAdapter.getInitialState<CurrencyState>({
  status: 'idle',
  error: null,
  baseCurrency: null,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Thunks
export const fetchCurrencies = createAsyncThunk(
  'currencies/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/finance/currencies', {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors du chargement des devises'
      );
    }
  }
);

export const addCurrency = createAsyncThunk(
  'currencies/add',
  async (currency: Omit<Currency, '_id'>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/finance/currencies', currency, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors de l'ajout de la devise"
      );
    }
  }
);

export const updateCurrency = createAsyncThunk(
  'currencies/update',
  async ({ id, currency }: { id: string; currency: Partial<Currency> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/finance/currencies/${id}`, currency, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la mise à jour de la devise'
      );
    }
  }
);

export const deleteCurrency = createAsyncThunk(
  'currencies/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/finance/currencies/${id}`, {
        headers: getAuthHeaders(),
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la suppression de la devise'
      );
    }
  }
);

export const setBaseCurrency = createAsyncThunk(
  'currencies/setBase',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(
        `/finance/currencies/${id}/set-base`,
        {},
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors du changement de devise de base'
      );
    }
  }
);

const currencySlice = createSlice({
  name: 'currencies',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrencies.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCurrencies.fulfilled, (state, action) => {
        state.status = 'succeeded';
        currencyAdapter.setAll(state, action.payload);
        state.baseCurrency = action.payload.find((c: Currency) => c.isBase) || null;
      })
      .addCase(fetchCurrencies.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(addCurrency.fulfilled, currencyAdapter.addOne)
      .addCase(updateCurrency.fulfilled, (state, action) => {
        currencyAdapter.updateOne(state, {
          id: action.payload._id,
          changes: action.payload,
        });
        if (action.payload.isBase) {
          state.baseCurrency = action.payload;
        }
      })
      .addCase(deleteCurrency.fulfilled, currencyAdapter.removeOne)
      .addCase(setBaseCurrency.fulfilled, (state, action) => {
        // Mettre à jour toutes les devises
        state.ids.forEach((id) => {
          if (state.entities[id]) {
            state.entities[id]!.isBase = id === action.payload._id;
          }
        });
        state.baseCurrency = action.payload;
      });
  },
});

export const currencyReducer = currencySlice.reducer;

// Sélecteurs
export const {
  selectAll: selectAllCurrencies,
  selectById: selectCurrencyById,
  selectEntities: selectCurrencyEntities,
} = currencyAdapter.getSelectors<RootState>((state) => state.currencies);

export const selectBaseCurrency = (state: RootState) => state.currencies.baseCurrency;
export const selectCurrencyStatus = (state: RootState) => state.currencies.status;
export const selectCurrencyError = (state: RootState) => state.currencies.error;
