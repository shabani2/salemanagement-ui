// lib/store/store.ts
"use client";

import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "./slices/auth/authSlice";
import { userReducer } from "./slices/users/userSlice";
import { regionReducer } from "./slices/regions/regionSlice";
import { pointVenteReducer } from "./slices/pointvente/pointventeSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    regions: regionReducer,
    pointVentes: pointVenteReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
