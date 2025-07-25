/* eslint-disable @typescript-eslint/ban-ts-comment */
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
import { Produit, ProduitModel } from '@/Models/produitsType';

interface ProduitState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// @ts-ignore
const produitAdapter: EntityAdapter<Produit, string> = createEntityAdapter<Produit, string>({
  //@ts-ignore
  selectId: (produit) => produit?._id,
});

const initialState = produitAdapter.getInitialState<ProduitState>({
  status: 'idle',
  error: null,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchProduits = createAsyncThunk(
  'produits/fetchProduits',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/produits', {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération des produits');
    }
  }
);

export const addProduit = createAsyncThunk(
  'produits/addProduit',
  async (produit: Omit<ProduitModel, '_id'>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/produits', produit, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la création du produit');
    }
  }
);

export const deleteProduit = createAsyncThunk(
  'produits/deleteProduit',
  async (produitId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/produits/${produitId}`, {
        headers: getAuthHeaders(),
      });
      return produitId;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la suppression du produit');
    }
  }
);

export const fetchProduitById = createAsyncThunk(
  'produits/fetchProduitById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/produits/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération du produit');
    }
  }
);

export const updateProduit = createAsyncThunk(
  'produits/updateProduit',
  async (
    produit: {
      _id: string;
      nom: string;
      categorie: string;
      prix: number;
      tva: number;
      prixVente: number;
      marge?: number;
      netTopay?: number;
      unite?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { _id, ...data } = produit;
      const response = await apiClient.put(`/produits/${_id}`, data, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la mise à jour du produit');
    }
  }
);

const produitSlice = createSlice({
  name: 'produits',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProduits.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProduits.fulfilled, (state, action) => {
        state.status = 'succeeded';
        produitAdapter.setAll(state, action.payload);
      })
      .addCase(fetchProduits.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(addProduit.fulfilled, (state, action) => {
        produitAdapter.addOne(state, action.payload);
      })
      .addCase(deleteProduit.fulfilled, (state, action) => {
        produitAdapter.removeOne(state, action.payload);
      })
      .addCase(fetchProduitById.fulfilled, (state, action) => {
        produitAdapter.upsertOne(state, action.payload);
      })
      .addCase(updateProduit.fulfilled, (state, action) => {
        produitAdapter.upsertOne(state, action.payload);
      });
  },
});

export const produitReducer = produitSlice.reducer;

export const {
  selectAll: selectAllProduits,
  selectById: selectProduitById,
  selectEntities: selectProduitEntities,
  selectIds: selectProduitIds,
  selectTotal: selectTotalProduits,
} = produitAdapter.getSelectors<RootState>((state) => state.produits);

export const selectProduitStatus = (state: RootState) => state.produits.status;
export const selectProduitError = (state: RootState) => state.produits.error;
