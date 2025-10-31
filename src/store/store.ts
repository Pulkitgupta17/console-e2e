import { configureStore } from "@reduxjs/toolkit";
// import themeReducer from "./themeSlice";
// import authReducer from "./authSlice";
// import customerReducer from "./customerSlice"
// import appStateReducer from "./appState";

const store = configureStore({
  reducer: {
    // theme: themeReducer,
    // auth: authReducer,
    // customers: customerReducer,
    // appState: appStateReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;