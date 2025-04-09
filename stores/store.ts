// lib/store/store.ts
"use client";

import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "./slices/auth/authSlice";
import { userReducer } from "./slices/users/userSlice";
import { regionReducer } from "./slices/regions/regionSlice";
import { pointVenteReducer } from "./slices/pointvente/pointventeSlice";
import { produitReducer } from "./slices/produits/produitsSlice";
import { categorieReducer } from "./slices/produits/categoriesSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    regions: regionReducer,
    pointVentes: pointVenteReducer,
    produits: produitReducer,
    categories: categorieReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
