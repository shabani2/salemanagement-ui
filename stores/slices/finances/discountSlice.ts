/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// finance/discountSlice.ts
'use client';

import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import { Discount, DiscountType } from '@/Models/FinanceModel';

const discountAdapter = createEntityAdapter<Discount, string>({
  // @ts-expect-error - compat: external lib types mismatch
  selectId: (discount: Discount) => discount?._id,
  sortComparer: (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
});

interface DiscountState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState = discountAdapter.getInitialState<DiscountState>({
  status: 'idle',
  error: null,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Thunks
export const fetchDiscounts = createAsyncThunk(
  'discounts/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/finance/discounts', {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors du chargement des réductions'
      );
    }
  }
);

export const addDiscount = createAsyncThunk(
  'discounts/add',
  async (discount: Omit<Discount, '_id'>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/finance/discounts', discount, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors de l'ajout de la réduction"
      );
    }
  }
);

export const updateDiscount = createAsyncThunk(
  'discounts/update',
  async ({ id, discount }: { id: string; discount: Partial<Discount> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/finance/discounts/${id}`, discount, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la mise à jour de la réduction'
      );
    }
  }
);

export const deleteDiscount = createAsyncThunk(
  'discounts/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/finance/discounts/${id}`, {
        headers: getAuthHeaders(),
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la suppression de la réduction'
      );
    }
  }
);

export const toggleDiscountStatus = createAsyncThunk(
  'discounts/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(
        `/finance/discounts/${id}/toggle-status`,
        {},
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors du changement de statut'
      );
    }
  }
);

const discountSlice = createSlice({
  name: 'discounts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDiscounts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDiscounts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        discountAdapter.setAll(state, action.payload);
      })
      .addCase(fetchDiscounts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(addDiscount.fulfilled, discountAdapter.addOne)
      .addCase(updateDiscount.fulfilled, (state, action) => {
        discountAdapter.updateOne(state, {
          id: action.payload._id,
          changes: action.payload,
        });
      })
      .addCase(deleteDiscount.fulfilled, discountAdapter.removeOne)
      .addCase(toggleDiscountStatus.fulfilled, (state, action) => {
        discountAdapter.updateOne(state, {
          id: action.payload._id,
          changes: { isActive: action.payload.isActive },
        });
      });
  },
});

export const discountReducer = discountSlice.reducer;

// Sélecteurs
export const { selectAll: selectAllDiscounts, selectById: selectDiscountById } =
  discountAdapter.getSelectors<RootState>((state) => state.discounts);

export const selectActiveDiscounts = (state: RootState) =>
  selectAllDiscounts(state).filter((d) => d.isActive);

export const selectDiscountByType = (type: DiscountType) => (state: RootState) =>
  selectAllDiscounts(state).filter((d) => d.type === type);

export const selectDiscountStatus = (state: RootState) => state.discounts.status;
export const selectDiscountError = (state: RootState) => state.discounts.error;
