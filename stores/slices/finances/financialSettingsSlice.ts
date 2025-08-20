/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import type { Status } from './currencySlice';

/* ---------- Types ---------- */
export interface FinancialSettings {
  _id?: string;
  defaultCurrency?: string | { _id: string; code: string; name: string; symbol?: string } | null;
  taxRate?: number;
  loyaltyPointsRatio?: number;
  invoiceDueDays?: number;
  latePaymentFee?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface FinancialSettingsState {
  status: Status;
  error: string | null;
  data: FinancialSettings | null;
}

const initialState: FinancialSettingsState = {
  status: 'idle',
  error: null,
  data: null,
};

/* ---------- Utils ---------- */
const getAuthHeaders = () => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* ---------- Thunks ---------- */

// GET /finance/settings
export const fetchFinancialSettings = createAsyncThunk<
  FinancialSettings,
  void,
  { rejectValue: string }
>('financialSettings/fetch', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get('/finance/settings', { headers: getAuthHeaders() });
    return res.data as FinancialSettings;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? 'Erreur lors du chargement des paramètres financiers');
  }
});

// PUT /finance/settings
export const updateFinancialSettings = createAsyncThunk<
  FinancialSettings,
  Partial<FinancialSettings>,
  { rejectValue: string }
>('financialSettings/update', async (payload, { rejectWithValue }) => {
  try {
    const res = await apiClient.put('/finance/settings', payload, { headers: getAuthHeaders() });
    return res.data as FinancialSettings;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? 'Erreur lors de la mise à jour des paramètres financiers');
  }
});

/* ---------- Slice ---------- */
const financialSettingsSlice = createSlice({
  name: 'financialSettings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchFinancialSettings.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFinancialSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload ?? null;
      })
      .addCase(fetchFinancialSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })
      // update
      .addCase(updateFinancialSettings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateFinancialSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload ?? null;
      })
      .addCase(updateFinancialSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur lors de la mise à jour';
      });
  },
});

export const financialSettingsReducer = financialSettingsSlice.reducer;

/* ---------- Selectors ---------- */
export const selectFinancialSettings = (s: RootState) =>
  (s as any).financialSettings?.data as FinancialSettings | null;
export const selectFinancialSettingsStatus = (s: RootState) =>
  (s as any).financialSettings?.status as Status;
export const selectFinancialSettingsError = (s: RootState) =>
  (s as any).financialSettings?.error as string | null;
