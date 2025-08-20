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

/* ---------- Types ---------- */
export type Status = 'idle' | 'loading' | 'succeeded' | 'failed';
// types/CurrencyDTO.ts
export interface CurrencyDTO {
  _id?: string; // ObjectId en string côté front
  code: string; // ex: "USD", "CDF"
  name: string; // ex: "US Dollar"
  symbol?: string; // ex: "$", "FC"
  isBase?: boolean; // true si devise de base
  createdAt?: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface Currency {
  _id?: string;
  code: string;
  name: string;
  symbol?: string;
  isBase?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface CurrencyStateExtra {
  status: Status;
  error: string | null;
  baseCurrency: Currency | null;
}

const currencyAdapter: EntityAdapter<Currency, string> = createEntityAdapter<Currency, string>({
  // @ts-expect-error allow ObjectId
  selectId: (c) => c._id ?? c.id,
  sortComparer: (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
});

const initialState = currencyAdapter.getInitialState<CurrencyStateExtra>({
  status: 'idle',
  error: null,
  baseCurrency: null,
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

// GET /finance/currencies
export const fetchCurrencies = createAsyncThunk<
  Currency[],
  { q?: string } | undefined,
  { rejectValue: string }
>('currencies/fetchAll', async (params, { rejectWithValue }) => {
  try {
    // NB: /finance/currencies n’a pas d’endpoint /search ; on envoie q si tu veux l’exploiter plus tard
    const qs = toQueryString({ q: params?.q });
    const res = await apiClient.get(`/finance/currencies${qs}`, { headers: getAuthHeaders() });
    return (Array.isArray(res.data) ? res.data : (res.data?.data ?? [])) as Currency[];
  } catch (e: any) {
    return rejectWithValue(e?.message ?? 'Erreur lors du chargement des devises');
  }
});

// GET /finance/currencies/base
export const fetchBaseCurrency = createAsyncThunk<Currency, void, { rejectValue: string }>(
  'currencies/fetchBase',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get('/finance/currencies/base', { headers: getAuthHeaders() });
      return res.data as Currency;
    } catch (e: any) {
      return rejectWithValue(e?.message ?? 'Erreur lors du chargement de la devise de base');
    }
  }
);

// POST /finance/currencies
export const addCurrency = createAsyncThunk<
  Currency,
  Omit<Currency, '_id'>,
  { rejectValue: string }
>('currencies/add', async (payload, { rejectWithValue }) => {
  try {
    const res = await apiClient.post('/finance/currencies', payload, { headers: getAuthHeaders() });
    return res.data as Currency;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? 'Erreur lors de la création de la devise');
  }
});

/* ---------- Slice ---------- */
const currencySlice = createSlice({
  name: 'currencies',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchCurrencies
      .addCase(fetchCurrencies.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCurrencies.fulfilled, (state, action) => {
        state.status = 'succeeded';
        currencyAdapter.setAll(state, action.payload ?? []);
      })
      .addCase(fetchCurrencies.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })
      // fetchBaseCurrency
      .addCase(fetchBaseCurrency.fulfilled, (state, action) => {
        state.baseCurrency = action.payload ?? null;
      })
      .addCase(fetchBaseCurrency.rejected, (state, action) => {
        state.baseCurrency = null;
        state.error = (action.payload as string) ?? state.error;
      })
      // addCurrency
      .addCase(addCurrency.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addCurrency.fulfilled, (state, action) => {
        state.status = 'succeeded';
        currencyAdapter.addOne(state, action.payload);
      })
      .addCase(addCurrency.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur lors de la création';
      });
  },
});

export const currencyReducer = currencySlice.reducer;

/* ---------- Selectors ---------- */
export const {
  selectAll: selectAllCurrencies,
  selectById: selectCurrencyById,
  selectEntities: selectCurrencyEntities,
} = currencyAdapter.getSelectors<RootState>((s) => (s as any).currencies);

export const selectCurrenciesStatus = (s: RootState) => (s as any).currencies?.status as Status;
export const selectCurrenciesError = (s: RootState) =>
  (s as any).currencies?.error as string | null;
export const selectBaseCurrency = (s: RootState) =>
  (s as any).currencies?.baseCurrency as Currency | null;
