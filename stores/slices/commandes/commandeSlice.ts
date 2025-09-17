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

export type CommandeProduitInput = {
  produit: string;
  quantite: number;
};

export type CommandePayload = {
  user: string;
  region?: string;
  pointVente?: string;
  requestedRegion?: string;
  requestedPointVente?: string;
  depotCentral?: boolean;
  fournisseur?: string;
  produits: CommandeProduitInput[];
  print?: boolean;
  format?: 'pos58' | 'pos80' | 'A5' | 'A4';
  organisation?: any;
};

export type CreateCommandeResult =
  | { type: 'json'; data: Commande }
  | { type: 'pdf'; blob: Blob; filename: string };

interface CommandeState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  totalCommandes: number;
  page: number;
  limit: number;
}

export function downloadBlob(blob: Blob, filename = 'document.pdf') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseFilenameFromDisposition(cd?: string): string | null {
  if (!cd) return null;
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^\";]+)"?/i.exec(cd);
  return decodeURIComponent(match?.[1] || match?.[2] || '');
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

const q = (params?: Record<string, any>) => {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
};

// ----------------------
// Thunks
// ----------------------

// All
export const fetchCommandes = createAsyncThunk(
  'commandes/fetchCommandes',
  async ({ page = 1, limit = 10 }: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/commandes${q({ page, limit })}`, {
        headers: getAuthHeaders(),
      });
      return { ...res.data, page, limit };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Erreur de récupération des commandes');
    }
  }
);

// By User
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

// By PointVente
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
      return rejectWithValue(error?.message || 'Erreur de récupération des commandes du point de vente');
    }
  }
);

// By Region
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

// By RequestedRegion
export const fetchCommandesByRequestedRegion = createAsyncThunk(
  'commandes/fetchByRequestedRegion',
  async (
    { requestedRegionId, page = 1, limit = 10 }: { requestedRegionId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.get(`/commandes/by-requested-region/${requestedRegionId}${q({ page, limit })}`, {
        headers: getAuthHeaders(),
      });
      return { ...res.data, page, limit };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Erreur lors des commandes par région source');
    }
  }
);

// By RequestedPointVente
export const fetchCommandesByRequestedPointVente = createAsyncThunk(
  'commandes/fetchByRequestedPointVente',
  async (
    { requestedPointVenteId, page = 1, limit = 10 }: { requestedPointVenteId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.get(`/commandes/by-requested-point-vente/${requestedPointVenteId}${q({ page, limit })}`, {
        headers: getAuthHeaders(),
      });
      return { ...res.data, page, limit };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Erreur lors des commandes par PV source');
    }
  }
);

// By Fournisseur
export const fetchCommandesByFournisseur = createAsyncThunk(
  'commandes/fetchByFournisseur',
  async (
    { fournisseurId, page = 1, limit = 10 }: { fournisseurId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.get(`/commandes/by-fournisseur/${fournisseurId}${q({ page, limit })}`, {
        headers: getAuthHeaders(),
      });
      return { ...res.data, page, limit };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Erreur lors des commandes par fournisseur');
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
      return res.data as Commande;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Commande introuvable');
    }
  }
);

// Create
export const createCommande = createAsyncThunk<CreateCommandeResult, CommandePayload, { rejectValue: string }>(
  'commandes/createCommande',
  async (payload, { rejectWithValue }) => {
    try {
      if (payload.print) {
        const { print, format = 'pos80', ...body } = payload;
        const res = await apiClient.post(`/commandes?pdf=1&format=${encodeURIComponent(format)}`, body, {
          headers: {
            ...getAuthHeaders(),
            Accept: 'application/pdf',
          },
          responseType: 'blob',
        });

        const cd = (res.headers as any)['content-disposition'] || (res.headers as any)['Content-Disposition'];
        const filename = parseFilenameFromDisposition(cd) || 'Bon_de_commande.pdf';

        return { type: 'pdf', blob: res.data as Blob, filename };
      }

      const res = await apiClient.post('/commandes', payload, {
        headers: getAuthHeaders(),
      });
      return { type: 'json', data: res.data as Commande };
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Erreur lors de la création de la commande');
    }
  }
);

// Print existing
export const printCommandeById = createAsyncThunk<
  { blob: Blob; filename: string },
  { id: string; format?: 'pos58' | 'pos80' | 'A5' | 'A4' },
  { rejectValue: string }
>('commandes/printCommandeById', async ({ id, format = 'pos80' }, { rejectWithValue }) => {
  try {
    const res = await apiClient.get(`/commandes/${id}/print?format=${encodeURIComponent(format)}`, {
      headers: {
        ...getAuthHeaders(),
        Accept: 'application/pdf',
      },
      responseType: 'blob',
    });

    const cd = (res.headers as any)['content-disposition'] || (res.headers as any)['Content-Disposition'];
    const filename = parseFilenameFromDisposition(cd) || `Bon_de_commande_${id}.pdf`;

    return { blob: res.data as Blob, filename };
  } catch (error: any) {
    return rejectWithValue(error?.response?.data?.message || "Erreur lors de l'impression du bon de commande");
  }
});

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

// ----------------------
// Slice
// ----------------------
const commandeSlice = createSlice({
  name: 'commandes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
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

      // autres fetchBy...
      .addCase(fetchCommandesByUser.fulfilled, (state, action) => {
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total ?? 0;
        state.page = action.payload.page ?? 1;
        state.limit = action.payload.limit ?? 10;
      })
      .addCase(fetchCommandesByPointVente.fulfilled, (state, action) => {
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total ?? 0;
        state.page = action.payload.page ?? 1;
        state.limit = action.payload.limit ?? 10;
      })
      .addCase(fetchCommandesByRegion.fulfilled, (state, action) => {
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total ?? 0;
        state.page = action.payload.page ?? 1;
        state.limit = action.payload.limit ?? 10;
      })
      .addCase(fetchCommandesByRequestedRegion.fulfilled, (state, action) => {
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total ?? 0;
        state.page = action.payload.page ?? 1;
        state.limit = action.payload.limit ?? 10;
      })
      .addCase(fetchCommandesByRequestedPointVente.fulfilled, (state, action) => {
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total ?? 0;
        state.page = action.payload.page ?? 1;
        state.limit = action.payload.limit ?? 10;
      })
      .addCase(fetchCommandesByFournisseur.fulfilled, (state, action) => {
        commandeAdapter.setAll(state, action.payload.commandes);
        state.totalCommandes = action.payload.total ?? 0;
        state.page = action.payload.page ?? 1;
        state.limit = action.payload.limit ?? 10;
      })

      .addCase(fetchCommandeById.fulfilled, (state, action) => {
        commandeAdapter.upsertOne(state, action.payload);
      })
      .addCase(createCommande.fulfilled, (state, action) => {
        //@ts-ignore
        if (action.payload.type === 'json') {
          commandeAdapter.addOne(state, action.payload.data);
          state.totalCommandes += 1;
        }
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

// ----------------------
// Export
// ----------------------
export const commandeReducer = commandeSlice.reducer;

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
