import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import countriesReducer from "./countriesSlice";
// import themeReducer from "./themeSlice";
// import customerReducer from "./customerSlice"
// import appStateReducer from "./appState";

const store = configureStore({
  reducer: {
    auth: authReducer,
    countries: countriesReducer,
    // theme: themeReducer,
    // customers: customerReducer,
    // appState: appStateReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
import { useDispatch, useSelector } from "react-redux";
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export default store;