'use client';

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  EntityAdapter,
} from '@reduxjs/toolkit';
import { apiClient } from '../../../lib/apiConfig';
import { User } from '@/Models/UserType';

interface AuthState {
  token: string | null;
  user: User | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  info: string | null;
}

const userAdapter: EntityAdapter<User, string> = createEntityAdapter<User, string>({
  selectId: (user) => user?._id,
});

const initialState = userAdapter.getInitialState<AuthState>({
  token: typeof window !== 'undefined' ? localStorage.getItem('token-agricap') : null,
  user:
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user-agricap') || 'null')
      : null,
  status: 'idle',
  error: null,
  info: null,
});

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData: FormData, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/auth/register', userData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data; // { message }
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Erreur lors de l’inscription');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { telephone: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/auth/login', credentials);
      localStorage.setItem('token-agricap', res.data.token);
      localStorage.setItem('user-agricap', JSON.stringify(res.data.user));
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Erreur de connexion');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (payload: { email: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/auth/forgot-password', payload);
      return res.data; // { message }
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Erreur envoi reset');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (payload: { token: string; id: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/auth/reset-password', payload);
      return res.data; // { message }
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Erreur reset');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  localStorage.removeItem('token-agricap');
  localStorage.removeItem('user-agricap');
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    clearInfo: (state) => { state.info = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => { state.status = 'loading'; })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.info = action.payload.message || 'Vérifiez votre email pour activer le compte.';
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed'; state.error = action.payload as string;
      })
      .addCase(loginUser.pending, (state) => { state.status = 'loading'; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.user = action.payload.user;
        userAdapter.addOne(state, action.payload.user);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed'; state.error = action.payload as string;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.status = 'succeeded'; state.info = action.payload.message;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.status = 'failed'; state.error = action.payload as string;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.status = 'succeeded'; state.info = action.payload.message;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.status = 'failed'; state.error = action.payload as string;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.token = null; state.user = null; state.status = 'idle';
      });
  },
});

export const { clearError, clearInfo } = authSlice.actions;
export const authReducer = authSlice.reducer;
export const { selectAll: selectUsers } = userAdapter.getSelectors((state: any) => state.auth);
export const selectAuthUser = (state: any) => state.auth.user;
export const selectAuthInfo = (state: any) => state.auth.info;
export const selectAuthError = (state: any) => state.auth.error;