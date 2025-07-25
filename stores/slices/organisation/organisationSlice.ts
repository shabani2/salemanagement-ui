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

export interface Organisation {
  _id: string;
  nom: string;
  rccm: string;
  contact: string;
  siegeSocial: string;
  logo?: string;
  devise: string;
  superAdmin: string;
  pays: string;
  idNat: string;
  numeroImpot: string;
  emailEntreprise: string;
  createdAt?: string;
  updatedAt?: string;
}

interface OrganisationState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  currentOrganisation: Organisation | null;
}

const organisationAdapter: EntityAdapter<Organisation, string> = createEntityAdapter<
  Organisation,
  string
>({
  selectId: (org) => org._id,
});

const initialState = organisationAdapter.getInitialState<OrganisationState>({
  status: 'idle',
  error: null,
  currentOrganisation: null,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchOrganisations = createAsyncThunk(
  'organisations/fetchOrganisations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/organisations', {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération des organisations');
    }
  }
);

export const addOrganisation = createAsyncThunk(
  'organisations/addOrganisation',
  async (formDataInput: FormData | Record<string, any>, { rejectWithValue }) => {
    try {
      let formData = new FormData();

      if (!(formDataInput instanceof FormData)) {
        for (const key in formDataInput) {
          if (key === 'logo' && formDataInput[key] instanceof File) {
            formData.append('logo', formDataInput[key]);
          } else {
            formData.append(key, formDataInput[key]);
          }
        }
      } else {
        formData = formDataInput;
      }

      const response = await apiClient.post('/organisations', formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Erreur lors de la création de l'organisation");
    }
  }
);

export const deleteOrganisation = createAsyncThunk(
  'organisations/deleteOrganisation',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/organisations/${id}`, {
        headers: getAuthHeaders(),
      });
      return id;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Erreur lors de la suppression de l'organisation");
    }
  }
);

export const updateOrganisation = createAsyncThunk(
  'organisations/updateOrganisation',
  async (
    { id, data }: { id: string; data: Partial<Organisation> & { logo?: File } },
    { rejectWithValue }
  ) => {
    try {
      let body: FormData | Partial<Organisation> = data;

      // si nouveau logo (File), alors multipart/form-data
      //@ts-ignore
      const hasFile = data.logo instanceof File;
      if (hasFile) {
        const formData = new FormData();
        for (const key in data) {
          //@ts-ignore
          if (key === 'logo' && data.logo instanceof File) {
            formData.append('logo', data.logo);
          } else {
            formData.append(key, (data as any)[key]);
          }
        }
        body = formData;
      }

      const response = await apiClient.put(`/organisations/${id}`, body, {
        headers: {
          ...getAuthHeaders(),
          ...(hasFile && { 'Content-Type': 'multipart/form-data' }),
        },
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Erreur lors de la mise à jour de l'organisation");
    }
  }
);

export const fetchOrganisationById = createAsyncThunk(
  'organisations/fetchOrganisationById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/organisations/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Erreur lors de la récupération de l'organisation");
    }
  }
);

const organisationSlice = createSlice({
  name: 'organisations',
  initialState,
  reducers: {
    setCurrentOrganisation(state, action) {
      state.currentOrganisation = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrganisations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        organisationAdapter.setAll(state, action.payload);
        state.currentOrganisation = action.payload[0] || null; // Set the first organisation as current if available
      })
      .addCase(fetchOrganisations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(addOrganisation.fulfilled, (state, action) => {
        organisationAdapter.addOne(state, action.payload);
      })
      .addCase(deleteOrganisation.fulfilled, (state, action) => {
        organisationAdapter.removeOne(state, action.payload);
      })
      .addCase(updateOrganisation.fulfilled, (state, action) => {
        organisationAdapter.updateOne(state, {
          id: action.payload._id,
          changes: action.payload,
        });
      })
      .addCase(fetchOrganisationById.fulfilled, (state, action) => {
        state.currentOrganisation = action.payload;
      });
  },
});

export const fetchDefaultOrganisationLogo = createAsyncThunk(
  'organisations/fetchDefaultOrganisationLogo',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/organisations/logo', {
        headers: getAuthHeaders(),
      });
      return response.data.logoUrl; // ou response.data selon backend
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la récupération du logo');
    }
  }
);

export const organisationReducer = organisationSlice.reducer;

export const { setCurrentOrganisation } = organisationSlice.actions;

export const {
  selectAll: selectAllOrganisations,
  selectById: selectOrganisationById,
  selectEntities: selectOrganisationEntities,
  selectIds: selectOrganisationIds,
  selectTotal: selectTotalOrganisations,
} = organisationAdapter.getSelectors<RootState>((state) => state.organisations);

export const selectOrganisationStatus = (state: RootState) => state.organisations.status;
export const selectOrganisationError = (state: RootState) => state.organisations.error;
export const selectCurrentOrganisation = (state: RootState) =>
  state.organisations.currentOrganisation;
