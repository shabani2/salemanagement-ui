'use client';

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  EntityAdapter,
} from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { apiClient } from '../../../lib/apiConfig';
import { PointVente, PointVenteModel } from '@/Models/pointVenteType';

// ✅ Interface pour l'état des points de vente

interface PointVenteState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ✅ Adapter pour gérer les points de vente
const pointVenteAdapter: EntityAdapter<PointVente, string> = createEntityAdapter<
  PointVente,
  string
>({
  selectId: (pointVente) => pointVente._id,
});

// ✅ Initialisation de l'état avec l'adapter
const initialState = pointVenteAdapter.getInitialState<PointVenteState>({
  status: 'idle',
  error: null,
});

// ✅ Fonction pour récupérer le token d'authentification
const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ✅ Thunk pour récupérer les points de vente
export const fetchPointVentes = createAsyncThunk(
  'pointVentes/fetchPointVentes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/point-ventes', {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération des points de vente');
    }
  }
);

export const fetchPointVenteById = createAsyncThunk(
  'pointVentes/fetchPointVenteById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/point-ventes/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération du point de vente');
    }
  }
);

export const fetchPointVentesByRegionId = createAsyncThunk(
  'Stock/fetchPointVenteByRegionId',
  async (regionId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/point-ventes/region/${regionId}`, {
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

// ✅ Thunk pour ajouter un point de vente
export const addPointVente = createAsyncThunk(
  'pointVentes/addPointVente',
  async (pointVente: PointVenteModel, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/point-ventes', pointVente, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de l’ajout du point de vente');
    }
  }
);

// ✅ Thunk pour supprimer un point de vente
export const deletePointVente = createAsyncThunk(
  'pointVentes/deletePointVente',
  async (pointVenteId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/point-ventes/${pointVenteId}`, {
        headers: getAuthHeaders(),
      });
      return pointVenteId;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la suppression du point de vente');
    }
  }
);
export const updatePointVente = createAsyncThunk(
  'pointVentes/updatePointVente',
  async (
    { id, updateData }: { id: string; updateData: Partial<PointVente> },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.put(`/point-ventes/${id}`, updateData, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la mise à jour du point de vente');
    }
  }
);

// ✅ Création du slice Redux
const pointVenteSlice = createSlice({
  name: 'pointVentes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPointVentes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        pointVenteAdapter.setAll(state, action.payload);
      })
      .addCase(fetchPointVentes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(addPointVente.fulfilled, (state, action) => {
        pointVenteAdapter.addOne(state, action.payload);
      })
      .addCase(deletePointVente.fulfilled, (state, action) => {
        pointVenteAdapter.removeOne(state, action.payload);
      })
      .addCase(fetchPointVentesByRegionId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        pointVenteAdapter.setAll(state, action.payload);
      })
      .addCase(fetchPointVentesByRegionId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(fetchPointVenteById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        pointVenteAdapter.upsertOne(state, action.payload);
      })
      .addCase(fetchPointVenteById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(updatePointVente.fulfilled, (state, action) => {
        pointVenteAdapter.upsertOne(state, action.payload);
      })
      .addCase(updatePointVente.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const pointVenteReducer = pointVenteSlice.reducer;

// ✅ Sélecteurs générés automatiquement
export const {
  selectAll: selectAllPointVentes,
  selectById: selectPointVenteById,
  selectEntities: selectPointVenteEntities,
  selectIds: selectPointVenteIds,
  selectTotal: selectTotalPointVentes,
} = pointVenteAdapter.getSelectors<RootState>((state) => state.pointVentes);

// ✅ Sélecteurs personnalisés
export const selectPointVenteStatus = (state: RootState) => state.pointVentes.status;
export const selectPointVenteError = (state: RootState) => state.pointVentes.error;
