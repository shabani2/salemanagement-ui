/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// features/commande/commandeSlice.ts

'use client';

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  EntityAdapter,
} from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import { Commande } from '@/Models/commandeType';

//import { CommandeProduit } from '../../../Models/CommandeProduitType';

interface CommandeState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const commandeAdapter: EntityAdapter<Commande, string> = createEntityAdapter<Commande, string>({
  //@ts-ignore
  selectId: (commande) => commande._id,
});

const initialState = commandeAdapter.getInitialState<CommandeState>({
  status: 'idle',
  error: null,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchCommandes = createAsyncThunk(
  'commandes/fetchCommandes',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get('/commandes', { headers: getAuthHeaders() });
      return res.data.commandes;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de récupération des commandes');
    }
  }
);

export const addCommande = createAsyncThunk(
  'commandes/addCommande',
  async (commande: Omit<Commande, '_id'>, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/commandes', commande, { headers: getAuthHeaders() });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de la commande');
    }
  }
);

export const updateCommande = createAsyncThunk(
  'commandes/updateCommande',
  async (commande: Commande, { rejectWithValue }) => {
    try {
      const { _id, ...data } = commande;
      const res = await apiClient.put(`/commandes/${_id}`, data, { headers: getAuthHeaders() });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de mise à jour de la commande');
    }
  }
);

export const deleteCommande = createAsyncThunk(
  'commandes/deleteCommande',
  async (commandeId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/commandes/${commandeId}`, { headers: getAuthHeaders() });
      return commandeId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de suppression de la commande');
    }
  }
);

const commandeSlice = createSlice({
  name: 'commandes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommandes.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCommandes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeAdapter.setAll(state, action.payload);
      })
      .addCase(fetchCommandes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(addCommande.fulfilled, (state, action) => {
        commandeAdapter.addOne(state, action.payload);
      })
      .addCase(updateCommande.fulfilled, (state, action) => {
        commandeAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteCommande.fulfilled, (state, action) => {
        commandeAdapter.removeOne(state, action.payload);
      });
  },
});

export const commandeReducer = commandeSlice.reducer;

export const {
  selectAll: selectAllCommandes,
  selectById: selectCommandeById,
  selectEntities: selectCommandeEntities,
  selectIds: selectCommandeIds,
  selectTotal: selectTotalCommandes,
} = commandeAdapter.getSelectors<RootState>((state) => state.commandes);

export const selectCommandeStatus = (state: RootState) => state.commandes.status;
export const selectCommandeError = (state: RootState) => state.commandes.error;
