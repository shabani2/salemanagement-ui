/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  EntityAdapter,
} from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import { CommandeProduit } from '../../../Models/CommandeProduitType';

interface CommandeProduitState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const commandeProduitAdapter: EntityAdapter<CommandeProduit, string> = createEntityAdapter<
  CommandeProduit,
  string
>({
  selectId: (cp) => (cp as any)?._id as string,
});

const initialState = commandeProduitAdapter.getInitialState<CommandeProduitState>({
  status: 'idle',
  error: null,
});

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token-agricap') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * GET /commande-produits/:commandeId
 * -> { commande, produits: CommandeProduit[] }
 */
export const fetchCommandeProduitsByCommande = createAsyncThunk(
  'commandeProduits/fetchByCommande',
  async (commandeId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commande-produits/${commandeId}`, {
        headers: getAuthHeaders(),
      });
      return Array.isArray(res.data?.produits) ? res.data.produits : [];
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Erreur lors de la récupération des produits de la commande'
      );
    }
  }
);

/**
 * GET /commande-produits/by-user/:userId
 */
export const fetchCommandeProduitsByUser = createAsyncThunk(
  'commandeProduits/fetchByUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commande-produits/by-user/${userId}`, {
        headers: getAuthHeaders(),
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Erreur lors de la récupération des produits (utilisateur)'
      );
    }
  }
);

/**
 * GET /commande-produits/by-pointvente/:pointVenteId
 */
export const fetchCommandeProduitsByPointVente = createAsyncThunk(
  'commandeProduits/fetchByPointVente',
  async (pointVenteId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commande-produits/by-pointvente/${pointVenteId}`, {
        headers: getAuthHeaders(),
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Erreur lors de la récupération des produits (point de vente)'
      );
    }
  }
);

/**
 * GET /commande-produits/by-region/:regionId
 */
export const fetchCommandeProduitsByRegion = createAsyncThunk(
  'commandeProduits/fetchByRegion',
  async (regionId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commande-produits/by-region/${regionId}`, {
        headers: getAuthHeaders(),
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Erreur lors de la récupération des produits (région)'
      );
    }
  }
);

/**
 * PUT /commande-produits/:id
 * Body: champs optionnels { produit?, quantite?, statut?, mouvementStockId? }
 * -> renvoie l’élément CommandeProduit mis à jour
 */
export const updateCommandeProduit = createAsyncThunk(
  'commandeProduits/updateOne',
  async (
    {
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<CommandeProduit, 'produit' | 'quantite' | 'statut'>> & {
        mouvementStockId?: string | null;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.put(`/commande-produits/${id}`, updates, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Erreur lors de la mise à jour du produit de commande'
      );
    }
  }
);

const commandeProduitSlice = createSlice({
  name: 'commandeProduits',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetch by commande
      .addCase(fetchCommandeProduitsByCommande.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCommandeProduitsByCommande.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeProduitAdapter.setAll(state, action.payload);
      })
      .addCase(fetchCommandeProduitsByCommande.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // by user
      .addCase(fetchCommandeProduitsByUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeProduitAdapter.setAll(state, action.payload);
      })
      .addCase(fetchCommandeProduitsByUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // by pointVente
      .addCase(fetchCommandeProduitsByPointVente.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeProduitAdapter.setAll(state, action.payload);
      })
      .addCase(fetchCommandeProduitsByPointVente.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // by region
      .addCase(fetchCommandeProduitsByRegion.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeProduitAdapter.setAll(state, action.payload);
      })
      .addCase(fetchCommandeProduitsByRegion.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // update one
      .addCase(updateCommandeProduit.fulfilled, (state, action) => {
        commandeProduitAdapter.upsertOne(state, action.payload);
      });
  },
});

export const commandeProduitReducer = commandeProduitSlice.reducer;

// Selectors
export const {
  selectAll: selectAllCommandeProduits,
  selectById: selectCommandeProduitById,
  selectEntities: selectCommandeProduitEntities,
  selectIds: selectCommandeProduitIds,
  selectTotal: selectTotalCommandeProduits,
} = commandeProduitAdapter.getSelectors<RootState>((state) => state.commandeProduits);

export const selectCommandeProduitStatus = (state: RootState) => state.commandeProduits.status;
export const selectCommandeProduitError = (state: RootState) => state.commandeProduits.error;
