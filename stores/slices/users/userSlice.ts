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
import { User, UserModel } from '../../../Models/UserType';

/* ---------------- Types pagination & requêtes ---------------- */
type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export type Order = 'asc' | 'desc';

export interface FetchParams {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
  region?: string; // filtre par région (user.region ou pv.region)
  pointVente?: string; // filtre par pointVente
  sortBy?: string; // 'createdAt' | 'nom' | 'prenom' | 'email' | 'telephone' | 'role' | 'region.nom' | 'pointVente.nom'
  order?: Order; // 'asc' | 'desc'
  includeTotal?: boolean;
}

/* ---------------- State ---------------- */
interface UserState {
  status: Status;
  error: string | null;
  meta: PaginationMeta | null;
}

const userAdapter: EntityAdapter<User, string> = createEntityAdapter<User, string>({
  selectId: (user) => user._id,
});

const initialState = userAdapter.getInitialState<UserState>({
  status: 'idle',
  error: null,
  meta: null,
});

/* ---------------- Utils ---------------- */
const getAuthHeaders = () => {
  try {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('token-agricap');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const toQueryString = (params: Record<string, any>) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

/* ---------------- Thunks ---------------- */

// Liste paginée / triée / filtrée
export const fetchUsers = createAsyncThunk<
  { data: User[]; meta?: PaginationMeta },
  FetchParams | undefined,
  { rejectValue: string }
>('users/fetchUsers', async (params, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      role,
      region,
      pointVente,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
    } = params || {};

    const query = toQueryString({
      page,
      limit,
      q,
      role,
      region,
      pointVente,
      sortBy,
      order,
      includeTotal,
    });

    const response = await apiClient.get(`/user${query}`, {
      headers: getAuthHeaders(),
    });
    return response.data as { data: User[]; meta?: PaginationMeta };
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération des utilisateurs');
  }
});

// Utilisateurs par région (AdminRegion) — accepte les mêmes query (q/tri/pagination)
export const fetchUsersByRegionId = createAsyncThunk<
  { data: User[]; meta?: PaginationMeta },
  { regionId?: string } & Omit<FetchParams, 'region' | 'pointVente'>,
  { rejectValue: string }
>('users/fetchUsersByRegionId', async ({ regionId, ...params }, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      role,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
    } = params;

    const query = toQueryString({
      page,
      limit,
      q,
      role,
      sortBy,
      order,
      includeTotal,
    });

    const url = regionId ? `/user/region/${regionId}${query}` : `/user/region${query}`;
    const response = await apiClient.get(url, {
      headers: getAuthHeaders(),
    });
    return response.data as { data: User[]; meta?: PaginationMeta };
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération des utilisateurs (région)');
  }
});

// Utilisateurs par point de vente (AdminPointVente)
export const fetchUsersByPointVenteId = createAsyncThunk<
  { data: User[]; meta?: PaginationMeta },
  { pointVenteId: string } & Omit<FetchParams, 'region' | 'pointVente'>,
  { rejectValue: string }
>('users/fetchUsersByPointVenteId', async ({ pointVenteId, ...params }, { rejectWithValue }) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      role,
      sortBy = 'createdAt',
      order = 'desc',
      includeTotal = true,
    } = params;

    const query = toQueryString({
      page,
      limit,
      q,
      role,
      sortBy,
      order,
      includeTotal,
    });

    const response = await apiClient.get(`/user/pointvente/${pointVenteId}${query}`, {
      headers: getAuthHeaders(),
    });
    return response.data as { data: User[]; meta?: PaginationMeta };
  } catch (error: unknown) {
    if (error instanceof Error) return rejectWithValue(error.message);
    return rejectWithValue('Erreur lors de la récupération des utilisateurs (point de vente)');
  }
});

// Création
export const addUser = createAsyncThunk<User, UserModel, { rejectValue: string }>(
  'users/addUser',
  async (user, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/user', user, {
        headers: getAuthHeaders(),
      });
      return response.data as User;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de l’ajout de l’utilisateur');
    }
  }
);

// Mise à jour (multipart)
export const updateUser = createAsyncThunk<User, FormData, { rejectValue: string }>(
  'users/updateUser',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/user`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data as User;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la mise à jour de l’utilisateur');
    }
  }
);

// Suppression
export const deleteUser = createAsyncThunk<string, string, { rejectValue: string }>(
  'users/deleteUser',
  async (userId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/user/${userId}`, {
        headers: getAuthHeaders(),
      });
      return userId;
    } catch (error: unknown) {
      if (error instanceof Error) return rejectWithValue(error.message);
      return rejectWithValue('Erreur lors de la suppression de l’utilisateur');
    }
  }
);

/* ---------------- Slice ---------------- */
const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    addUserLocal: userAdapter.addOne,
  },
  extraReducers: (builder) => {
    builder
      /** fetchUsers */
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const data = action.payload?.data ?? [];
        const meta = action.payload?.meta ?? null;
        userAdapter.setAll(state, data);
        state.meta = meta;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /** fetchUsersByRegionId */
      .addCase(fetchUsersByRegionId.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUsersByRegionId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const data = action.payload?.data ?? [];
        const meta = action.payload?.meta ?? null;
        userAdapter.setAll(state, data);
        state.meta = meta;
      })
      .addCase(fetchUsersByRegionId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /** fetchUsersByPointVenteId */
      .addCase(fetchUsersByPointVenteId.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUsersByPointVenteId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const data = action.payload?.data ?? [];
        const meta = action.payload?.meta ?? null;
        userAdapter.setAll(state, data);
        state.meta = meta;
      })
      .addCase(fetchUsersByPointVenteId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      })

      /** addUser */
      .addCase(addUser.fulfilled, (state, action) => {
        userAdapter.addOne(state, action.payload);
        if (state.meta) {
          state.meta.total += 1;
          state.meta.totalPages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
        }
      })

      /** updateUser */
      .addCase(updateUser.fulfilled, (state, action) => {
        userAdapter.upsertOne(state, action.payload);
      })

      /** deleteUser */
      .addCase(deleteUser.fulfilled, (state, action) => {
        userAdapter.removeOne(state, action.payload);
        if (state.meta) {
          state.meta.total = Math.max(0, state.meta.total - 1);
          state.meta.totalPages = Math.max(1, Math.ceil(state.meta.total / state.meta.limit));
        }
      });
  },
});

export const userReducer = userSlice.reducer;

/* ---------------- Selectors ---------------- */
export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectEntities: selectUserEntities,
  selectIds: selectUserIds,
  selectTotal: selectTotalUsers,
} = userAdapter.getSelectors<RootState>((state) => state.users);

export const selectUserStatus = (state: RootState) => state.users.status;
export const selectUserError = (state: RootState) => state.users.error;
export const selectUserMeta = (state: RootState) => state.users.meta;

/** Filtre par rôle côté client (optionnel) */
export const selectUserByRole = (role: string) => (state: RootState) =>
  selectAllUsers(state).filter((u) => u?.role === role);
