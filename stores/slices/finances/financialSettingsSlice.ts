/* eslint-disable @typescript-eslint/no-explicit-any */
// finance/financialSettingsSlice.ts
'use client';

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import { FinancialSettings } from '@/Models/FinanceModel';

interface FinancialSettingsState {
  data: FinancialSettings | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: FinancialSettingsState = {
  data: null,
  status: 'idle',
  error: null,
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Thunks
export const fetchFinancialSettings = createAsyncThunk(
  'financialSettings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/finance/settings', {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors du chargement des paramètres financiers'
      );
    }
  }
);

export const updateFinancialSettings = createAsyncThunk(
  'financialSettings/update',
  async (settings: Partial<FinancialSettings>, { rejectWithValue }) => {
    try {
      const response = await apiClient.put('/finance/settings', settings, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la mise à jour des paramètres'
      );
    }
  }
);

const financialSettingsSlice = createSlice({
  name: 'financialSettings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinancialSettings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFinancialSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchFinancialSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(updateFinancialSettings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateFinancialSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(updateFinancialSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const financialSettingsReducer = financialSettingsSlice.reducer;

// Sélecteurs
export const selectFinancialSettings = (state: RootState) => state.financialSettings.data;
export const selectFinancialSettingsStatus = (state: RootState) => state.financialSettings.status;
export const selectFinancialSettingsError = (state: RootState) => state.financialSettings.error;
export const selectTaxRate = (state: RootState) => state.financialSettings.data?.taxRate || 0;
export const selectLoyaltyPointsRatio = (state: RootState) =>
  state.financialSettings.data?.loyaltyPointsRatio || 0;
