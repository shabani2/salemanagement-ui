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
  //@ts-ignore
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

// file: [Votre fichier de slice/thunks Redux (ex: usersSlice.ts)]

// Modèles pour les données entrantes et sortantes
type MessageResponse = { message: string; user: User }; // Assumons que le backend renvoie le message ET l'utilisateur créé/mis à jour
interface UserCreationPayload {
  // Pour le cas où l'Admin envoie les données sans fichier (JSON)
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  password: string; // Le mot de passe est obligatoire lors de la création manuelle
  role: User['role'];
  pointVente?: string;
  region?: string;
  // Image non incluse ici car elle sera gérée par l'Admin via une route séparée ou l'update
}

// --- Thunk 1: Ajout d'un Utilisateur par Admin (Route: /api/users/create, pas d'upload initial) ---
export const createUser = createAsyncThunk<
  User, // La valeur renvoyée par le thunk (l'utilisateur créé)
  UserCreationPayload, // Le payload attendu pour la création manuelle
  { rejectValue: string }
>('users/addUser', async (user, { rejectWithValue }) => {
  try {
   
    const response = await apiClient.post<MessageResponse>('/user', user, {
      headers: getAuthHeaders(),
    });

    // On retourne l'objet utilisateur pour l'ajouter au state
    return response.data.user;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      'Erreur lors de l’ajout de l’utilisateur.';
    return rejectWithValue(String(msg));
  }
});

// --- Thunk 2: Mise à jour d'un Utilisateur (Utilise FormData pour gérer les fichiers) ---
export const updateUser = createAsyncThunk<
  User, // La valeur renvoyée par le thunk (l'utilisateur mis à jour)
  FormData, // Le payload est FormData car il peut inclure des fichiers
  { rejectValue: string }
>('users/updateUser', async (formData, { rejectWithValue }) => {
  try {
    // L'ID doit généralement être inclus dans le FormData ou dans l'URL/Headers pour l'identifier
    // Assumons que l'ID est dans le FormData et que le backend sait le traiter.
    const response = await apiClient.put<MessageResponse>(`/user`, formData, {
      headers: {
        ...getAuthHeaders(),
        // 🛑 Très important pour les uploads avec FormData
        'Content-Type': 'multipart/form-data',
      },
    });

    // On retourne l'objet utilisateur mis à jour
    return response.data.user;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      'Erreur lors de la mise à jour de l’utilisateur.';
    return rejectWithValue(String(msg));
  }
});

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
      .addCase(createUser.fulfilled, (state, action) => {
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
