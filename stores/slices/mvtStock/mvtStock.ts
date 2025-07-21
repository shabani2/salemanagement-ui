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
import { MouvementStock } from '@/Models/mouvementStockType';

interface MouvementStockState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const mouvementStockAdapter: EntityAdapter<MouvementStock, string> = createEntityAdapter<
  MouvementStock,
  string
>({
  selectId: (mouvement) => mouvement._id,
});

const initialState = mouvementStockAdapter.getInitialState<MouvementStockState>({
  status: 'idle',
  error: null,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchMouvementsStock = createAsyncThunk(
  'mouvementStock/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/mouvementStock', {
        headers: getAuthHeaders(),
      });
      // Vérification de la présence de user dans la réponse
      if (response.data.some((m: MouvementStock) => !m.user)) {
        console.warn("Certains mouvements n'ont pas de propriété user");
      }
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération des mouvements de stock');
    }
  }
);

export const fetchMouvementStockById = createAsyncThunk(
  'mouvementStock/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/mouvementStock/${id}`, {
        headers: getAuthHeaders(),
      });
      // Validation de la réponse
      if (!response.data.user) {
        console.warn('Le mouvement ne contient pas de propriété user', response.data);
      }
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération du mouvement de stock');
    }
  }
);

export const fetchMouvementStockByRegionId = createAsyncThunk(
  'mouvementStock/fetchByRegionId',
  async (regionId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/mouvementStock/region/${regionId}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération du mouvement de stock');
    }
  }
);

export const fetchMouvementStockByPointVenteId = createAsyncThunk(
  'mouvementStock/fetchBypointVenteId',
  async (pointVenteId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/mouvementStock/by-point-vente/${pointVenteId}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération du mouvement de stock');
    }
  }
);

// Nouveau type pour la création avec le champ user obligatoire
type CreateMouvementStockData = Omit<MouvementStock, '_id'> & {
  user: string; // ID de l'utilisateur
};

export const createMouvementStock = createAsyncThunk(
  'mouvementStock/create',
  async (data: CreateMouvementStockData, { rejectWithValue }) => {
    try {
      // Validation du champ user
      if (!data.user) {
        return rejectWithValue("Le champ 'user' est obligatoire");
      }

      const response = await apiClient.post('/mouvementStock', data, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la création du mouvement de stock');
    }
  }
);

export const updateMouvementStock = createAsyncThunk(
  'mouvementStock/update',
  async (data: MouvementStock, { rejectWithValue }) => {
    try {
      // Validation du champ user
      if (!data.user) {
        return rejectWithValue("Le champ 'user' est obligatoire");
      }

      const response = await apiClient.put(`/mouvementStock/${data._id}`, data, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la mise à jour du mouvement de stock');
    }
  }
);

export const deleteMouvementStock = createAsyncThunk(
  'mouvementStock/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/mouvementStock/${id}`, {
        headers: getAuthHeaders(),
      });
      return id;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la suppression du mouvement de stock');
    }
  }
);

export const validateMouvementStock = createAsyncThunk(
  'mouvementStock/validate',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        `/mouvementStock/validate/${id}`,
        {},
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la validation du mouvement de stock');
    }
  }
);

// 1. Pagination simple par point de vente
export const fetchMouvementStockByPointVente = createAsyncThunk(
  'mouvementStock/fetchByPointVenteId',
  async (
    { pointVenteId, page = 1 }: { pointVenteId: string; page?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.get(
        `/mouvementStock/by-point-vente/page/${pointVenteId}?page=${page}`,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération des mouvements');
    }
  }
);

// 2. Agrégation par point de vente (total par produit/type)
export const fetchMouvementStockAggregatedByPointVente = createAsyncThunk(
  'mouvementStock/fetchAggregatedByPointVente',
  async (
    { pointVenteId, page = 1 }: { pointVenteId: string; page?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.get(
        `/mouvementStock/by-point-vente/aggregate/${pointVenteId}?page=${page}`,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Erreur lors de l'agrégation des mouvements");
    }
  }
);

// 3. Pagination simple par utilisateur
export const fetchMouvementStockByUserId = createAsyncThunk(
  'mouvementStock/fetchByUserId',
  async ({ userId, page = 1 }: { userId: string; page?: number }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/mouvementStock/byUser/${userId}?page=${page}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération des mouvements utilisateur');
    }
  }
);

// 4. Agrégation par utilisateur (total par produit)
export const fetchMouvementStockAggregatedByUserId = createAsyncThunk(
  'mouvementStock/fetchAggregatedByUserId',
  async ({ userId, page = 1 }: { userId: string; page?: number }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/mouvementStock/byUser/aggregate/${userId}?page=${page}`,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Erreur lors de l'agrégation des mouvements utilisateur");
    }
  }
);

const mouvementStockSlice = createSlice({
  name: 'mouvementStock',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMouvementsStock.fulfilled, (state, action) => {
        state.status = 'succeeded';
        mouvementStockAdapter.setAll(state, action.payload);
      })
      .addCase(fetchMouvementsStock.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(createMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.addOne(state, action.payload);
      })
      .addCase(fetchMouvementStockById.fulfilled, (state, action) => {
        mouvementStockAdapter.upsertOne(state, action.payload);
      })
      .addCase(updateMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.upsertOne(state, action.payload);
      })
      .addCase(validateMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteMouvementStock.fulfilled, (state, action) => {
        mouvementStockAdapter.removeOne(state, action.payload);
      })
      .addCase(fetchMouvementStockByPointVenteId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        mouvementStockAdapter.setAll(state, action.payload);
      })
      .addCase(fetchMouvementStockByPointVenteId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(fetchMouvementStockByRegionId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        mouvementStockAdapter.setAll(state, action.payload);
      })
      .addCase(fetchMouvementStockByRegionId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const mouvementStockReducer = mouvementStockSlice.reducer;

export const {
  selectAll: selectAllMouvementsStock,
  selectById: selectMouvementStockById,
  selectEntities: selectMouvementStockEntities,
  selectIds: selectMouvementStockIds,
  selectTotal: selectTotalMouvementsStock,
} = mouvementStockAdapter.getSelectors<RootState>((state) => state.mouvementStock);

export const selectMouvementStockStatus = (state: RootState) => state.mouvementStock.status;
export const selectMouvementStockError = (state: RootState) => state.mouvementStock.error;
