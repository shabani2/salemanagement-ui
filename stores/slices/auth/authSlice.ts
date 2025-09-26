/* eslint-disable @typescript-eslint/no-explicit-any */
/* file: lib/store/authSlice.ts */
'use client';

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  EntityAdapter,
  PayloadAction,
} from '@reduxjs/toolkit';
import { apiClient } from '../../../lib/apiConfig';
import { User } from '@/Models/UserType';

type RegisterResponse = { message: string };
type LoginResponse = { token: string; user: User };
type MessageResponse = { message: string };

interface AuthState {
  token: string | null;
  user: User | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastMessage: string | null;
}

const userAdapter: EntityAdapter<User, string> = createEntityAdapter<User, string>({
  //@ts-ignore
  selectId: (user) => user?._id,
});

const getStored = <T = unknown>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const initialState = userAdapter.getInitialState<AuthState>({
  token: typeof window !== 'undefined' ? localStorage.getItem('token-agricap') : null,
  user: getStored<User>('user-agricap'),
  status: 'idle',
  error: null,
  lastMessage: null,
});

/* --------------------------------- Thunks --------------------------------- */

export const registerUser = createAsyncThunk<RegisterResponse, FormData, { rejectValue: string }>(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<RegisterResponse>('/auth/register', userData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        'Erreur lors de l’inscription';
      return rejectWithValue(String(msg));
    }
  }
);

export const loginUser = createAsyncThunk<
  LoginResponse,
  { email: string; password: string },
  { rejectValue: string }
>('auth/loginUser', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token-agricap', data.token);
      localStorage.setItem('user-agricap', JSON.stringify(data.user));
    }
    return data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Erreur de connexion';
    return rejectWithValue(String(msg));
  }
});

export const logoutUser = createAsyncThunk<MessageResponse | null, void, { rejectValue: string }>(
  'auth/logoutUser',
  async (_arg, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<MessageResponse>('/auth/logout');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token-agricap');
        localStorage.removeItem('user-agricap');
      }
      return data ?? { message: 'Déconnexion réussie' };
    } catch (error: any) {
      // On nettoie quand même localStorage côté client
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token-agricap');
        localStorage.removeItem('user-agricap');
      }
      const msg =
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        'Erreur lors de la déconnexion';
      return rejectWithValue(String(msg));
    }
  }
);

export const forgotPassword = createAsyncThunk<
  MessageResponse,
  { email: string },
  { rejectValue: string }
>('auth/forgotPassword', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<MessageResponse>('/auth/forgot-password', payload);
    return data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      "Erreur lors de l'envoi de l'email";
    return rejectWithValue(String(msg));
  }
});

export const resetPassword = createAsyncThunk<
  MessageResponse,
  { id: string; token: string; password: string },
  { rejectValue: string }
>('auth/resetPassword', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<MessageResponse>('/auth/reset-password', payload);
    return data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Erreur lors de la réinitialisation';
    return rejectWithValue(String(msg));
  }
});

export const updateFirstPassword = createAsyncThunk<
  MessageResponse,
  { id: string; password: string }, // Seul l'ID et le nouveau mot de passe sont nécessaires
  { rejectValue: string }
>('auth/updateFirstPassword', async (payload, { rejectWithValue }) => {
  try {
    // ⚠️ Assurez-vous que votre route backend '/auth/update-password' existe
    // et gère la mise à jour pour un utilisateur déjà authentifié/identifié par ID.
    const { data } = await apiClient.post<MessageResponse>('/auth/update-password', payload);
    return data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Erreur lors de la mise à jour du mot de passe.';
    return rejectWithValue(String(msg));
  }
});

/**
 * Optionnel (souvent géré par navigation directe depuis l’email).
 * On considère succès si 2xx/3xx. En cas de 302, axios suit souvent la redirection (same-origin).
 */
export const verifyEmail = createAsyncThunk<
  MessageResponse,
  { id: string; token: string },
  { rejectValue: string }
>('auth/verifyEmail', async ({ id, token }, { rejectWithValue }) => {
  try {
    const { data, status } = await apiClient.get<MessageResponse>('/auth/verify-email', {
      params: { id, token },
      // axios navigateur suit les 302 automatiquement; pas de maxRedirects ici
    });
    // Si backend renvoie une page après redirection, `data` ne sera pas {message}; on standardise.
    return (
      data && typeof data === 'object' && 'message' in data
        ? data
        : { message: status < 400 ? 'Email vérifié' : 'Vérification effectuée' }
    ) as MessageResponse;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      "Erreur lors de la vérification d'email";
    return rejectWithValue(String(msg));
  }
});

/* --------------------------------- Slice ---------------------------------- */

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.lastMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* register */
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.lastMessage = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<RegisterResponse>) => {
        state.status = 'succeeded';
        state.lastMessage = action.payload.message;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur lors de l’inscription';
      })

      /* login */
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.lastMessage = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.lastMessage = 'Connexion réussie';
        userAdapter.setOne(state, action.payload.user);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur de connexion';
      })

      /* logout */
      .addCase(logoutUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state, action: PayloadAction<MessageResponse | null>) => {
        state.token = null;
        state.user = null;
        state.status = 'idle';
        state.error = null;
        state.lastMessage = action.payload?.message ?? 'Déconnexion réussie';
        userAdapter.removeAll(state);
      })
      .addCase(logoutUser.rejected, (state, action) => {
        // Même en cas d’échec backend, on est localement déconnecté
        state.token = null;
        state.user = null;
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur lors de la déconnexion';
        userAdapter.removeAll(state);
      })

      /* forgot password */
      .addCase(forgotPassword.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.lastMessage = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action: PayloadAction<MessageResponse>) => {
        state.status = 'succeeded';
        state.lastMessage = action.payload.message;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? "Erreur lors de l'envoi de l'email";
      })

      /* reset password */
      .addCase(resetPassword.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.lastMessage = null;
      })
      .addCase(resetPassword.fulfilled, (state, action: PayloadAction<MessageResponse>) => {
        state.status = 'succeeded';
        state.lastMessage = action.payload.message;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur lors de la réinitialisation';
      })

      /* verify email (optionnel) */
      .addCase(verifyEmail.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.lastMessage = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action: PayloadAction<MessageResponse>) => {
        state.status = 'succeeded';
        state.lastMessage = action.payload.message ?? 'Email vérifié';
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? "Erreur lors de la vérification d'email";
      });
  },
});

export const { clearError, clearMessage } = authSlice.actions;
export const authReducer = authSlice.reducer;

/* -------------------------------- Selectors ------------------------------- */
export const { selectAll: selectUsers } = userAdapter.getSelectors((state: any) => state.auth);
export const selectAuthUser = (state: any): User | null => state.auth.user;
export const selectAuthToken = (state: any): string | null => state.auth.token;
export const selectAuthStatus = (state: any): AuthState['status'] => state.auth.status;
export const selectAuthError = (state: any): string | null => state.auth.error;
export const selectAuthMessage = (state: any): string | null => state.auth.lastMessage;
