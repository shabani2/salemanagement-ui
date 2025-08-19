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
  page: number;
  limit: number;
}

// ✅ types d’input pour la création
type CommandeProduitInput = {
  produit: string; // ObjectId as string
  quantite: number;
  uniteMesure?: string; // optionnel
};

export interface CommandePayload {
  user: string;
  region?: string;
  pointVente?: string;
  depotCentral?: boolean;
  produits: CommandeProduitInput[]; // ⬅️ au lieu du Pick<>
}

const commandeAdapter: EntityAdapter<Commande, string> = createEntityAdapter<Commande, string>({
  selectId: (commande) => (commande as any)?._id as string,
});

const initialState = commandeAdapter.getInitialState<CommandeState>({
  status: 'idle',
  error: null,
  totalCommandes: 0,
  page: 1,
  limit: 10,
});

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token-agricap') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helpers pour querystring
const q = (params?: Record<string, any>) => {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
};

// All (paginated)
export const fetchCommandes = createAsyncThunk(
  'commandes/fetchCommandes',
  async ({ page = 1, limit = 10 }: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commandes${q({ page, limit })}`, {
        headers: getAuthHeaders(),
      });
      // { total, commandes }
      return { ...res.data, page, limit };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Erreur de récupération des commandes');
    }
  }
);

// By User (paginated)
export const fetchCommandesByUser = createAsyncThunk(
  'commandes/fetchByUser',
  async (
    { userId, page = 1, limit = 10 }: { userId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.get(`/commandes/by-user/${userId}${q({ page, limit })}`, {
        headers: getAuthHeaders(),
      });
      return { ...res.data, page, limit };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Erreur de récupération des commandes utilisateur');
    }
  }
);

// By PointVente (paginated)
export const fetchCommandesByPointVente = createAsyncThunk(
  'commandes/fetchByPointVente',
  async (
    { pointVenteId, page = 1, limit = 10 }: { pointVenteId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.get(
        `/commandes/by-pointvente/${pointVenteId}${q({ page, limit })}`,
        { headers: getAuthHeaders() }
      );
      return { ...res.data, page, limit };
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Erreur de récupération des commandes du point de vente'
      );
    }
  }
);

// By Region (paginated côté back = total calculé après filtre)
export const fetchCommandesByRegion = createAsyncThunk(
  'commandes/fetchByRegion',
  async (
    { regionId, page = 1, limit = 10 }: { regionId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.get(`/commandes/by-region/${regionId}${q({ page, limit })}`, {
        headers: getAuthHeaders(),
      });
      return { ...res.data, page, limit };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Erreur de récupération des commandes par région');
    }
  }
);

// By ID
export const fetchCommandeById = createAsyncThunk(
  'commandes/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commandes/${id}`, {
        headers: getAuthHeaders(),
      });
      // renvoie une commande formatée
      return res.data as Commande;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Commande introuvable');
    }
  }
);

// Create
export const createCommande = createAsyncThunk(
  'commandes/createCommande',
  async (payload: CommandePayload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/commandes', payload, {
        headers: getAuthHeaders(),
      });
      // renvoie la commande peuplée
      return response.data as Commande;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || 'Erreur lors de la création de la commande'
      );
    }
  }
);

// Update
export const updateCommande = createAsyncThunk(
  'commandes/updateCommande',
  async (commande: Commande, { rejectWithValue }) => {
    try {
      const { _id, ...data } = commande as any;
      const res = await apiClient.put(`/commandes/${_id}`, data, {
        headers: getAuthHeaders(),
      });
      return res.data as Commande;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Erreur de mise à jour de la commande');
    }
  }
);

// Delete
export const deleteCommande = createAsyncThunk(
  'commandes/deleteCommande',
  async (commandeId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/commandes/${commandeId}`, {
        headers: getAuthHeaders(),
      });
      return commandeId;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Erreur de suppression de la commande');
    }
  }
);

const commandeSlice = createSlice({
  name: 'commandes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetch all
      .addCase(fetchCommandes.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCommandes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total ?? 0;
        state.page = action.payload.page ?? 1;
        state.limit = action.payload.limit ?? 10;
      })
      .addCase(fetchCommandes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // by user
      .addCase(fetchCommandesByUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total ?? 0;
        state.page = action.payload.page ?? 1;
        state.limit = action.payload.limit ?? 10;
      })

      // by pointVente
      .addCase(fetchCommandesByPointVente.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total ?? 0;
        state.page = action.payload.page ?? 1;
        state.limit = action.payload.limit ?? 10;
      })

      // by region
      .addCase(fetchCommandesByRegion.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total ?? 0;
        state.page = action.payload.page ?? 1;
        state.limit = action.payload.limit ?? 10;
      })

      // by id
      .addCase(fetchCommandeById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        commandeAdapter.upsertOne(state, action.payload);
      })

      // create / update / delete
      .addCase(createCommande.fulfilled, (state, action) => {
        commandeAdapter.addOne(state, action.payload);
        state.totalCommandes += 1;
      })
      .addCase(updateCommande.fulfilled, (state, action) => {
        commandeAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteCommande.fulfilled, (state, action) => {
        commandeAdapter.removeOne(state, action.payload);
        state.totalCommandes = Math.max(0, state.totalCommandes - 1);
      });
  },
});

// Reducer
export const commandeReducer = commandeSlice.reducer;

// Selectors
export const {
  selectAll: selectAllCommandes,
  selectById: selectCommandeById,
  selectEntities: selectCommandeEntities,
  selectIds: selectCommandeIds,
  selectTotal: selectTotalCommandesSel,
} = commandeAdapter.getSelectors<RootState>((state) => state.commandes);

export const selectCommandeStatus = (state: RootState) => state.commandes.status;
export const selectCommandeError = (state: RootState) => state.commandes.error;
export const selectCommandeTotalCount = (state: RootState) => state.commandes.totalCommandes;
export const selectCommandePage = (state: RootState) => state.commandes.page;
export const selectCommandeLimit = (state: RootState) => state.commandes.limit;
