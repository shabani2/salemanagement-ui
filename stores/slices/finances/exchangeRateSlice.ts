/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  type EntityAdapter,
} from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import type { Status } from './currencySlice';

/* ---------- Types ---------- */
export interface CurrencyRef {
  _id?: string;
  code?: string;
  name?: string;
  symbol?: string;
}

export interface ExchangeRate {
  _id?: string;
  baseCurrency: string | CurrencyRef;
  targetCurrency: string | CurrencyRef;
  rate: number;
  effectiveDate?: string;
  expirationDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ExchangeRateStateExtra {
  status: Status;
  error: string | null;
  lastPair?: { baseId: string; targetId: string } | null;
  lastPairRate?: ExchangeRate | null;
}

const adapter: EntityAdapter<ExchangeRate, string> = createEntityAdapter<ExchangeRate, string>({
  selectId: (r) =>
    r._id ??
    `${(r.baseCurrency as any)?._id ?? r.baseCurrency}__${(r.targetCurrency as any)?._id ?? r.targetCurrency}`,
  sortComparer: (a, b) => (b.effectiveDate ?? '').localeCompare(a.effectiveDate ?? ''),
});

const initialState = adapter.getInitialState<ExchangeRateStateExtra>({
  status: 'idle',
  error: null,
  lastPair: null,
  lastPairRate: null,
});

/* ---------- Utils ---------- */
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

/* ---------- Thunks ---------- */

// GET /finance/exchange-rates?baseCurrency=&targetCurrency=&active=
export const fetchExchangeRates = createAsyncThunk<
  ExchangeRate[],
  { baseCurrency?: string; targetCurrency?: string; active?: boolean } | undefined,
  { rejectValue: string }
>('exchangeRates/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const qs = toQueryString({
      baseCurrency: params?.baseCurrency,
      targetCurrency: params?.targetCurrency,
      active: params?.active,
    });
    const res = await apiClient.get(`/finance/exchange-rates${qs}`, { headers: getAuthHeaders() });
    return (Array.isArray(res.data) ? res.data : (res.data?.data ?? [])) as ExchangeRate[];
  } catch (e: any) {
    return rejectWithValue(e?.message ?? 'Erreur lors du chargement des taux');
  }
});

// GET /finance/exchange-rates/:baseId/:targetId
export const fetchExchangeRateByPair = createAsyncThunk<
  ExchangeRate,
  { baseId: string; targetId: string },
  { rejectValue: string }
>('exchangeRates/fetchByPair', async ({ baseId, targetId }, { rejectWithValue }) => {
  try {
    const res = await apiClient.get(`/finance/exchange-rates/${baseId}/${targetId}`, {
      headers: getAuthHeaders(),
    });
    return res.data as ExchangeRate;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? 'Taux non trouvé');
  }
});

/* ---------- Slice ---------- */
const exchangeRateSlice = createSlice({
  name: 'exchangeRates',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchExchangeRates
      .addCase(fetchExchangeRates.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchExchangeRates.fulfilled, (state, action) => {
        state.status = 'succeeded';
        adapter.setAll(state, action.payload ?? []);
      })
      .addCase(fetchExchangeRates.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })
      // fetchExchangeRateByPair
      .addCase(fetchExchangeRateByPair.fulfilled, (state, action) => {
        state.lastPair = {
          baseId: String((action.payload.baseCurrency as any)?._id ?? action.payload.baseCurrency),
          targetId: String(
            (action.payload.targetCurrency as any)?._id ?? action.payload.targetCurrency
          ),
        };
        state.lastPairRate = action.payload;
        adapter.upsertOne(state, action.payload);
      })
      .addCase(fetchExchangeRateByPair.rejected, (state, action) => {
        state.lastPairRate = null;
        state.error = (action.payload as string) ?? state.error;
      });
  },
});

export const exchangeRateReducer = exchangeRateSlice.reducer;

/* ---------- Selectors ---------- */
export const {
  selectAll: selectAllExchangeRates,
  selectById: selectExchangeRateById,
  selectEntities: selectExchangeRateEntities,
} = adapter.getSelectors<RootState>((s) => (s as any).exchangeRates);

export const selectExchangeRatesStatus = (s: RootState) =>
  (s as any).exchangeRates?.status as Status;
export const selectExchangeRatesError = (s: RootState) =>
  (s as any).exchangeRates?.error as string | null;
export const selectLastPair = (s: RootState) =>
  (s as any).exchangeRates?.lastPair as { baseId: string; targetId: string } | null;
export const selectLastPairRate = (s: RootState) =>
  (s as any).exchangeRates?.lastPairRate as ExchangeRate | null;
