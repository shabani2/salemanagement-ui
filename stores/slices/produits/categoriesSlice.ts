"use client";

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  EntityAdapter,
} from "@reduxjs/toolkit";
import { RootState } from "../../store";
import { apiClient } from "../../../lib/apiConfig";
import { Categorie } from "@/Models/produitsType";

interface CategorieState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const categorieAdapter: EntityAdapter<Categorie, string> = createEntityAdapter<
  Categorie,
  string
>({
  selectId: (categorie) => categorie?._id,
});

const initialState = categorieAdapter.getInitialState<CategorieState>({
  status: "idle",
  error: null,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem("token-agricap");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchCategories = createAsyncThunk(
  "categories/fetchCategories",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/categories", {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Erreur lors de la récupération des catégories");
    }
  },
);

export const addCategorie = createAsyncThunk(
  "categories/addCategorie",
  async (categorie: Omit<Categorie, "_id">, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/categories", categorie, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Erreur lors de la création de la catégorie");
    }
  },
);

export const deleteCategorie = createAsyncThunk(
  "categories/deleteCategorie",
  async (categorieId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/categories/${categorieId}`, {
        headers: getAuthHeaders(),
      });
      return categorieId;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Erreur lors de la suppression de la catégorie");
    }
  },
);

const categorieSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        categorieAdapter.setAll(state, action.payload);
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(addCategorie.fulfilled, (state, action) => {
        categorieAdapter.addOne(state, action.payload);
      })
      .addCase(deleteCategorie.fulfilled, (state, action) => {
        categorieAdapter.removeOne(state, action.payload);
      });
  },
});

export const categorieReducer = categorieSlice.reducer;

export const {
  selectAll: selectAllCategories,
  selectById: selectCategorieById,
  selectEntities: selectCategorieEntities,
  selectIds: selectCategorieIds,
  selectTotal: selectTotalCategories,
} = categorieAdapter.getSelectors<RootState>((state) => state.categories);

export const selectCategorieStatus = (state: RootState) =>
  state.categories.status;
export const selectCategorieError = (state: RootState) =>
  state.categories.error;
