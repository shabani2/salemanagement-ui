'use client';

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
 
  EntityAdapter,
} from '@reduxjs/toolkit';
import { RootState } from '../../store'; // Assure-toi que RootState est correctement importé
import { apiClient } from '../../../lib/apiConfig';
import { User, UserModel } from '../../../Models/UserType';

// ✅ Interface pour l'état utilisateur
interface UserState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ✅ Adapter pour gérer les utilisateurs avec Redux Toolkit
const userAdapter: EntityAdapter<User, string> = createEntityAdapter<User, string>({
  selectId: (user) => user._id, // _id doit être une string ou un number
});

// ✅ Initialisation de l'état avec l'adapter
const initialState = userAdapter.getInitialState<UserState>({
  status: 'idle',
  error: null,
});

// ✅ Fonction pour récupérer le token d'authentification
const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ✅ Thunk pour récupérer les utilisateurs
export const fetchUsers = createAsyncThunk('users/fetchUsers', async (_, { rejectWithValue }) => {
  try {
    const response = await apiClient.get('/user/users', {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return rejectWithValue(error.message);
    }
    return rejectWithValue('Erreur lors de la récupération des utilisateurs');
  }
});

// ✅ Thunk pour ajouter un utilisateur
export const addUser = createAsyncThunk(
  'users/addUser',
  async (user: UserModel, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/user/', user, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de l’ajout de l’utilisateur');
    }
  }
);

// ✅ Thunk pour mettre à jour un utilisateur
export const updateUser = createAsyncThunk(
  'users/updateUser',
  async (user: User, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/user`, user, {
        headers: getAuthHeaders(), // Ajoute le token d'authentification
      });
      console.log('response updating => : ', response.data);
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la mise à jour de l’utilisateur');
    }
  }
);

// ✅ Thunk pour supprimer un utilisateur
export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/user/${userId}`, {
        headers: getAuthHeaders(),
      });
      return userId;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la suppression de l’utilisateur');
    }
  }
);

// ✅ Création du slice Redux
const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    addUser: userAdapter.addOne,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        userAdapter.setAll(state, action.payload);
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(addUser.fulfilled, (state, action) => {
        userAdapter.addOne(state, action.payload);
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        userAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        userAdapter.removeOne(state, action.payload);
      });
  },
});

export const userReducer = userSlice.reducer;

// ✅ Sélecteurs générés automatiquement par `createEntityAdapter`
export const {
  selectAll: selectAllUsers, // Récupère tous les utilisateurs
  selectById: selectUserById, // Récupère un utilisateur par ID
  selectEntities: selectUserEntities, // Récupère les utilisateurs sous forme d’objet { id: user }
  selectIds: selectUserIds, // Récupère uniquement les IDs des utilisateurs
  selectTotal: selectTotalUsers, // Récupère le nombre total d’utilisateurs
} = userAdapter.getSelectors<RootState>((state) => state.users);

// ✅ Sélecteurs personnalisés
export const selectUserStatus = (state: RootState) => state.users.status;
export const selectUserError = (state: RootState) => state.users.error;

// ✅ Sélecteur pour récupérer les utilisateurs selon leur rôle
export const selectUserByRole = (role: string) => (state: RootState) => {
  const usersArray = selectAllUsers(state); // 🔥 Assure-toi de récupérer un tableau
  return usersArray.filter((user) => user.role === role);
};
