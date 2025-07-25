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
import { Region } from '@/Models/regionTypes';

// ✅ Interface pour l'état des régions

interface RegionState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ✅ Adapter pour gérer les régions
const regionAdapter: EntityAdapter<Region, string> = createEntityAdapter<Region, string>({
  //@ts-ignore
  selectId: (region) => region._id,
});

// ✅ Initialisation de l'état avec l'adapter
const initialState = regionAdapter.getInitialState<RegionState>({
  status: 'idle',
  error: null,
});

// ✅ Fonction pour récupérer le token d'authentification
const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ✅ Thunk pour récupérer les régions
export const fetchRegions = createAsyncThunk(
  'regions/fetchRegions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/region', {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération des régions');
    }
  }
);

// ✅ Thunk pour ajouter une région
export const addRegion = createAsyncThunk(
  'regions/addRegion',
  async (region: Omit<Region, '_id'>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/region', region, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de l’ajout de la région');
    }
  }
);

// ✅ Thunk pour mettre à jour une région
export const updateRegion = createAsyncThunk(
  'regions/updateRegion',
  async (region: Region, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/region/${region._id}`, region, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la mise à jour de la région');
    }
  }
);

// ✅ Thunk pour supprimer une région
export const deleteRegion = createAsyncThunk(
  'regions/deleteRegion',
  async (regionId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/region/${regionId}`, {
        headers: getAuthHeaders(),
      });
      return regionId;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la suppression de la région');
    }
  }
);

// ✅ Création du slice Redux
const regionSlice = createSlice({
  name: 'regions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRegions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        regionAdapter.setAll(state, action.payload);
      })
      .addCase(fetchRegions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(addRegion.fulfilled, (state, action) => {
        regionAdapter.addOne(state, action.payload);
      })
      .addCase(updateRegion.fulfilled, (state, action) => {
        regionAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteRegion.fulfilled, (state, action) => {
        regionAdapter.removeOne(state, action.payload);
      });
  },
});

export const regionReducer = regionSlice.reducer;

// ✅ Sélecteurs générés automatiquement
export const {
  selectAll: selectAllRegions,
  selectById: selectRegionById,
  selectEntities: selectRegionEntities,
  selectIds: selectRegionIds,
  selectTotal: selectTotalRegions,
} = regionAdapter.getSelectors<RootState>((state) => state.regions);

// ✅ Sélecteurs personnalisés
export const selectRegionStatus = (state: RootState) => state.regions.status;
export const selectRegionError = (state: RootState) => state.regions.error;
