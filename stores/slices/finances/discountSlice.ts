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
export interface Discount {
  _id?: string;
  code: string;
  description?: string;
  type?: string; // e.g., 'percent' | 'fixed'
  value?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DiscountStateExtra {
  status: Status;
  error: string | null;
  lastValidation?: { code: string; valid: boolean; discount?: Discount } | null;
}

const adapter: EntityAdapter<Discount, string> = createEntityAdapter<Discount, string>({
  // @ts-expect-error ObjectId compat
  selectId: (d) => d._id ?? d.id ?? d.code,
  sortComparer: (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
});

const initialState = adapter.getInitialState<DiscountStateExtra>({
  status: 'idle',
  error: null,
  lastValidation: null,
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

// GET /finance/discounts?type=&active=
export const fetchDiscounts = createAsyncThunk<
  Discount[],
  { type?: string; active?: boolean } | undefined,
  { rejectValue: string }
>('discounts/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const qs = toQueryString({ type: params?.type, active: params?.active });
    const res = await apiClient.get(`/finance/discounts${qs}`, { headers: getAuthHeaders() });
    return (Array.isArray(res.data) ? res.data : (res.data?.data ?? [])) as Discount[];
  } catch (e: any) {
    return rejectWithValue(e?.message ?? 'Erreur lors du chargement des réductions');
  }
});

// POST /finance/discounts
export const addDiscount = createAsyncThunk<
  Discount,
  Omit<Discount, '_id'>,
  { rejectValue: string }
>('discounts/add', async (payload, { rejectWithValue }) => {
  try {
    const res = await apiClient.post('/finance/discounts', payload, { headers: getAuthHeaders() });
    return res.data as Discount;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? 'Erreur lors de la création de la réduction');
  }
});

// GET /finance/discounts/validate/:code
export const validateDiscountCode = createAsyncThunk<
  { code: string; valid: boolean; discount?: Discount },
  { code: string },
  { rejectValue: string }
>('discounts/validate', async ({ code }, { rejectWithValue }) => {
  try {
    const res = await apiClient.get(`/finance/discounts/validate/${encodeURIComponent(code)}`, {
      headers: getAuthHeaders(),
    });
    const payload = res.data as { valid: boolean; discount?: Discount };
    return { code, valid: payload.valid, discount: payload.discount };
  } catch (e: any) {
    // 404 => invalide
    return rejectWithValue(e?.message ?? 'Code invalide ou expiré');
  }
});

/* ---------- Slice ---------- */
const discountSlice = createSlice({
  name: 'discounts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchDiscounts
      .addCase(fetchDiscounts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDiscounts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        adapter.setAll(state, action.payload ?? []);
      })
      .addCase(fetchDiscounts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })
      // addDiscount
      .addCase(addDiscount.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addDiscount.fulfilled, (state, action) => {
        state.status = 'succeeded';
        adapter.addOne(state, action.payload);
      })
      .addCase(addDiscount.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur lors de la création';
      })
      // validateDiscountCode
      .addCase(validateDiscountCode.fulfilled, (state, action) => {
        state.lastValidation = action.payload;
        if (action.payload.valid && action.payload.discount) {
          adapter.upsertOne(state, action.payload.discount);
        }
      })
      .addCase(validateDiscountCode.rejected, (state, action) => {
        state.lastValidation = { code: '', valid: false };
        state.error = (action.payload as string) ?? state.error;
      });
  },
});

export const discountReducer = discountSlice.reducer;

/* ---------- Selectors ---------- */
export const {
  selectAll: selectAllDiscounts,
  selectById: selectDiscountById,
  selectEntities: selectDiscountEntities,
} = adapter.getSelectors<RootState>((s) => (s as any).discounts);

export const selectDiscountsStatus = (s: RootState) => (s as any).discounts?.status as Status;
export const selectDiscountsError = (s: RootState) => (s as any).discounts?.error as string | null;
export const selectLastDiscountValidation = (s: RootState) =>
  (s as any).discounts?.lastValidation as {
    code: string;
    valid: boolean;
    discount?: Discount;
  } | null;
