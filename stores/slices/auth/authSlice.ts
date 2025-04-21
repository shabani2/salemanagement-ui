/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/store/authSlice.ts
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
}

const userAdapter: EntityAdapter<User, string> = createEntityAdapter<User, string>({
  selectId: (user) => user?._id, // _id doit être une string ou un number
});

const initialState = userAdapter.getInitialState<AuthState>({
  token: typeof window !== 'undefined' ? localStorage.getItem('token-agricap') : null,
  user:
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user-agricap') || 'null')
      : null,
  status: 'idle',
  error: null,
});

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData: FormData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/register', userData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
      // return 'created'
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Erreur lors de l’inscription');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { telephone: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      localStorage.setItem('token-agricap', response.data.token);
      localStorage.setItem('user-agricap', JSON.stringify(response.data.user));
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Erreur de connexion');
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
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        userAdapter.addOne(state, action.payload.user);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.user = action.payload.user;
        userAdapter.addOne(state, action.payload.user);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.token = null;
        state.user = null;
        state.status = 'idle';
      });
  },
});

export const { clearError } = authSlice.actions;
export const authReducer = authSlice.reducer;
export const { selectAll: selectUsers } = userAdapter.getSelectors((state: any) => state.auth);
export const selectAuthUser = (state: any) => state.auth.user;
