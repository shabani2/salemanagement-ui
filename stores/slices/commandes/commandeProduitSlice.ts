// features/commandeProduit/commandeProduitSlice.ts

'use client';

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  EntityAdapter,
} from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import { CommandeProduit} from '../../../Models/CommandeProduitType';

interface CommandeProduitState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const commandeProduitAdapter: EntityAdapter<CommandeProduit, string> =
  createEntityAdapter<CommandeProduit, string>({
    selectId: (cp) => cp?._id,
  });

const initialState = commandeProduitAdapter.getInitialState<CommandeProduitState>({
  status: 'idle',
  error: null,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchCommandeProduitsByCommande = createAsyncThunk(
  'commandeProduits/fetchByCommande',
  async (commandeId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commande-produits/${commandeId}`, {
        headers: getAuthHeaders(),
      });
      return res.data.produits; // assuming structure: { produits: [...] }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la récupération des produits de la commande');
    }
  }
);

export const updateStatutProduitCommande = createAsyncThunk(
  'commandeProduits/updateStatut',
  async (
    { commandeId, produitId, statut }: { commandeId: string; produitId: string; statut: 'attente' | 'livré' | 'annulé' },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.put(`/commande-produits/${commandeId}`, { produitId, statut }, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise à jour du statut du produit');
    }
  }
);

const commandeProduitSlice = createSlice({
  name: 'commandeProduits',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommandeProduitsByCommande.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCommandeProduitsByCommande.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeProduitAdapter.setAll(state, action.payload);
      })
      .addCase(fetchCommandeProduitsByCommande.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(updateStatutProduitCommande.fulfilled, (state, action) => {
        commandeProduitAdapter.upsertOne(state, action.payload);
      });
  },
});

export const commandeProduitReducer = commandeProduitSlice.reducer;

export const {
  selectAll: selectAllCommandeProduits,
  selectById: selectCommandeProduitById,
  selectEntities: selectCommandeProduitEntities,
  selectIds: selectCommandeProduitIds,
  selectTotal: selectTotalCommandeProduits,
} = commandeProduitAdapter.getSelectors<RootState>((state) => state.commandeProduits);

export const selectCommandeProduitStatus = (state: RootState) => state.commandeProduits.status;
export const selectCommandeProduitError = (state: RootState) => state.commandeProduits.error;
