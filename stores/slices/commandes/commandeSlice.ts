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
import { Commande } from '@/Models/commandeType';
import { CommandeProduit } from '@/Models/CommandeProduitType';

interface CommandeState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  totalCommandes: number;
}

export interface CommandePayload {
  user: string;
  region?: string;
  pointVente?: string;
  depotCentral?: boolean;
  produits: CommandeProduit[];
}

const commandeAdapter: EntityAdapter<Commande, string> = createEntityAdapter<Commande, string>({
  //@ts-ignore
  selectId: (commande) => commande._id,
});

const initialState = commandeAdapter.getInitialState<CommandeState>({
  status: 'idle',
  error: null,
  totalCommandes: 0,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 🔁 All
export const fetchCommandes = createAsyncThunk(
  'commandes/fetchCommandes',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get('/commandes', { headers: getAuthHeaders() });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de récupération des commandes');
    }
  }
);

// 🔁 By User
export const fetchCommandesByUser = createAsyncThunk(
  'commandes/fetchByUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commandes/by-user/${userId}`, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de récupération des commandes utilisateur');
    }
  }
);

// 🔁 By PointVente
export const fetchCommandesByPointVente = createAsyncThunk(
  'commandes/fetchByPointVente',
  async (pointVenteId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commandes/by-pointvente/${pointVenteId}`, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Erreur de récupération des commandes du point de vente'
      );
    }
  }
);

// 🔁 By Region
export const fetchCommandesByRegion = createAsyncThunk(
  'commandes/fetchByRegion',
  async (regionId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commandes/by-region/${regionId}`, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur de récupération des commandes par région');
    }
  }
);

// 🔁 By ID
export const fetchCommandeById = createAsyncThunk(
  'commandes/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commandes/${id}`, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Commande introuvable');
    }
  }
);

// 🆕 Create
export const createCommande = createAsyncThunk(
  'commandes/createCommande',
  async (payload: CommandePayload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/commandes', payload, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la création de la commande'
      );
    }
  }
);

// ✏️ Update
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

// 🗑️ Delete
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

// 🧩 Slice
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
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total;
      })
      .addCase(fetchCommandesByUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total;
      })
      .addCase(fetchCommandesByPointVente.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total;
      })
      .addCase(fetchCommandesByRegion.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total;
      })
      .addCase(fetchCommandeById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeAdapter.upsertOne(state, action.payload);
      })
      .addCase(fetchCommandes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(createCommande.fulfilled, (state, action) => {
        commandeAdapter.addOne(state, action.payload);
        state.totalCommandes += 1;
      })
      .addCase(updateCommande.fulfilled, (state, action) => {
        commandeAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteCommande.fulfilled, (state, action) => {
        commandeAdapter.removeOne(state, action.payload);
        state.totalCommandes -= 1;
      });
  },
});

// 🔎 Sélecteurs
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
export const selectCommandeTotalCount = (state: RootState) => state.commandes.totalCommandes;
