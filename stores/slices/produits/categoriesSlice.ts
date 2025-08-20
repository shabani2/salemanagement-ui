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
import { Categorie } from '@/Models/produitsType';

/* ============================== Helpers =============================== */

const isFile = (v: unknown): v is File => typeof File !== 'undefined' && v instanceof File;

const normStr = (v: unknown): string =>
  typeof v === 'string' ? v : v == null || String(v).toLowerCase() === 'undefined' ? '' : String(v);

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const buildCreatePayload = (data: { nom: string; type: string; image?: File | string | null }) => {
  const nom = normStr(data.nom);
  const type = normStr(data.type);

  if (isFile(data.image)) {
    const fd = new FormData();
    fd.append('nom', nom);
    fd.append('type', type);
    fd.append('image', data.image); // doit matcher upload.single('image')
    return fd; // multipart/form-data
  }
  // sans File => JSON
  return { nom, type, image: data.image ?? null };
};

const buildUpdatePayload = (data: {
  nom?: string;
  type?: string;
  image?: File | string | null;
}) => {
  const nom = data.nom !== undefined ? normStr(data.nom) : undefined;
  const type = data.type !== undefined ? normStr(data.type) : undefined;

  if (isFile(data.image)) {
    const fd = new FormData();
    if (nom !== undefined) fd.append('nom', nom);
    if (type !== undefined) fd.append('type', type);
    fd.append('image', data.image);
    return fd; // multipart
  }

  const out: Record<string, any> = {};
  if (nom !== undefined) out.nom = nom;
  if (type !== undefined) out.type = type;
  if (typeof data.image === 'string' || data.image === null) out.image = data.image;
  return out; // JSON partiel
};

/* ============================== State =============================== */

interface CategorieState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const categorieAdapter: EntityAdapter<Categorie, string> = createEntityAdapter<Categorie, string>({
  // @ts-expect-error - compat: external lib types mismatch
  selectId: (c) => c?._id,
});

const initialState = categorieAdapter.getInitialState<CategorieState>({
  status: 'idle',
  error: null,
});

/* ============================== Thunks =============================== */

export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get('/categories', {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Erreur lors de la récupération des catégories');
    }
  }
);

export const addCategorie = createAsyncThunk(
  'categories/addCategorie',
  async (
    categorie: { nom: string; type: string; image?: File | string | null },
    { rejectWithValue }
  ) => {
    try {
      const payload = buildCreatePayload(categorie);
      const isFD = typeof FormData !== 'undefined' && payload instanceof FormData;

      const res = await apiClient.post('/categories', payload, {
        headers: {
          ...getAuthHeaders(),
          // ❗️Ne JAMAIS fixer Content-Type si FormData (Axios mettra le boundary)
          ...(isFD ? {} : { 'Content-Type': 'application/json' }),
        },
        // ❗️Uniquement pour FormData. Pour JSON, on laisse Axios stringifier.
        ...(isFD ? { transformRequest: [(d) => d] } : {}),
        // withCredentials: false,  // garde ça false si tu utilises Bearer token
      });

      return res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Erreur lors de la création de la catégorie');
    }
  }
);

export const updateCategorie = createAsyncThunk(
  'categories/updateCategorie',
  async (
    {
      id,
      data,
    }: { id: string; data: { nom?: string; type?: string; image?: File | string | null } },
    { rejectWithValue }
  ) => {
    try {
      const payload = buildUpdatePayload(data);
      const isFD = typeof FormData !== 'undefined' && payload instanceof FormData;

      const res = await apiClient.put(`/categories/${id}`, payload, {
        headers: {
          ...getAuthHeaders(),
          ...(isFD ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(isFD ? { transformRequest: [(d) => d] } : {}),
      });

      return res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Erreur lors de la mise à jour de la catégorie');
    }
  }
);

export const deleteCategorie = createAsyncThunk(
  'categories/deleteCategorie',
  async (categorieId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/categories/${categorieId}`, {
        headers: getAuthHeaders(),
      });
      return categorieId;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Erreur lors de la suppression de la catégorie');
    }
  }
);

/* ============================== Slice =============================== */

const categorieSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      /* fetch */
      .addCase(fetchCategories.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = 'succeeded';
        categorieAdapter.setAll(state, action.payload);
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /* add */
      .addCase(addCategorie.pending, (state) => {
        state.error = null;
      })
      .addCase(addCategorie.fulfilled, (state, action) => {
        categorieAdapter.addOne(state, action.payload);
      })
      .addCase(addCategorie.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de la création';
      })

      /* update */
      .addCase(updateCategorie.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated?._id) {
          categorieAdapter.updateOne(state, {
            id: updated._id,
            changes: updated,
          });
        }
      })
      .addCase(updateCategorie.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de la mise à jour';
      })

      /* delete */
      .addCase(deleteCategorie.fulfilled, (state, action) => {
        categorieAdapter.removeOne(state, action.payload);
      })
      .addCase(deleteCategorie.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur lors de la suppression';
      });
  },
});

/* ============================== Exports =============================== */

export const categorieReducer = categorieSlice.reducer;

export const {
  selectAll: selectAllCategories,
  selectById: selectCategorieById,
  selectEntities: selectCategorieEntities,
  selectIds: selectCategorieIds,
  selectTotal: selectTotalCategories,
} = categorieAdapter.getSelectors<RootState>((state) => state.categories);

export const selectCategorieStatus = (state: RootState) => state.categories.status;
export const selectCategorieError = (state: RootState) => state.categories.error;
