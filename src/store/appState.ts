import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ApiError = "serverError" | "unauthorized" | "forbidden" | "none";

export interface AppState {
    errors: {
        error: boolean;
        type: ApiError;
    }
}

const initialState: AppState = {
    errors: {
        error: false,
        type: "none",
    }
}

export const appStateSlice = createSlice({ 
    name: 'appState',
    initialState,
    reducers: {
        setApiError: (state, action: PayloadAction<string>) => {
            state.errors.error = action.payload !== "none";
            state.errors.type = action.payload as ApiError;
        }
    }
});

export const { setApiError } = appStateSlice.actions;
export default appStateSlice.reducer;