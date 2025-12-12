import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getCountriesList } from "@/services/countriesService";

export interface CountriesState {
  countriesList: string[];
  restrictedCountriesList: string[];
  loading: boolean;
  error: string | null;
}

const initialState: CountriesState = {
  countriesList: [],
  restrictedCountriesList: [],
  loading: false,
  error: null,
};

// Async thunk to fetch countries
export const fetchCountries = createAsyncThunk(
  "countries/fetchCountries",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getCountriesList();
      // Handle both nested data structure and direct structure
      const servingCountries = response.data?.serving_countries || response.serving_countries || {};
      const restrictedCountries = response.data?.restricted_countries || response.restricted_countries || [];
      
      const arr = Object.keys(servingCountries);
      const countriesList = arr.map((x) => x.toLowerCase()).filter((c: string) => c.length === 2);
      const restrictedCountriesList = Array.isArray(restrictedCountries) 
        ? restrictedCountries.map((c: string) => c.toLowerCase()).filter((c: string) => c.length === 2)
        : [];
      
      
      return {
        countriesList,
        restrictedCountriesList,
      };
    } catch (error: any) {
      console.error('Failed to fetch countries:', error);
      return rejectWithValue(
        error?.response?.data?.message || "Failed to fetch countries"
      );
    }
  }
);

const countriesSlice = createSlice({
  name: "countries",
  initialState,
  reducers: {
    clearCountries: (state) => {
      state.countriesList = [];
      state.restrictedCountriesList = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCountries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        state.loading = false;
        state.countriesList = action.payload.countriesList;
        state.restrictedCountriesList = action.payload.restrictedCountriesList;
        state.error = null;
      })
      .addCase(fetchCountries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCountries } = countriesSlice.actions;
export default countriesSlice.reducer;

