import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getCookie, removeCookie } from '@/services/commonMethods';
import { jwtDecode } from "jwt-decode";
// import { getCustomerDetails } from '@/services/dashboard.service';
import { BASE_URL } from "@/constants/global.constants";

export type User = {
  username: string;
  first_name: string;
  last_name: string;
  customer_country: string;
  phone: string;
  crn: string;
  location: string;
  projectId: string;
  email: string;
}

type AuthState = {
  token: string | null;
  apiKey: string | null;
  isAuthenticated: boolean;

  user: any | null;
  loading: boolean;
  error: string | null;
};

const storedToken = getCookie("token");
const storedApiKey = getCookie("apikey");

const initialState: AuthState = {
  token: storedToken,
  apiKey: storedApiKey,
  isAuthenticated: validateUser(),

  user: null,
  loading: false,
  error: null,
};

export const fetchCustomerDetails = createAsyncThunk(
  "auth/fetchCustomerDetails",
  async (_, {rejectWithValue}) => {
    try {
    //   const userDetails = await getCustomerDetails();
    //   return userDetails;
    return null;
    } catch (error){
      return rejectWithValue(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  }
)

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.token = null;
      state.apiKey = null;
      state.isAuthenticated = false;
      state.user = null;
      logoutUser();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchCustomerDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string ?? "Failed to fetch customers";
      })
  },
});

export function isAuthenticated(): boolean {
  const currentToken = getCookie('token');
  const currentApikey = getCookie('apikey');
  return currentApikey && currentToken;
}

export function logoutUser(): any {
  localStorage.clear();
  const cookiesToBeRemoved = ['apikey', 'token', 'theme', 'email', 'userData'];
  cookiesToBeRemoved.forEach((cookie: any) => removeCookie(cookie));
  window.location.href = BASE_URL;
}

export function validateUser(): boolean {
  try {
    if (isAuthenticated()) {
      const token = getCookie('token');
      const decoded: any = jwtDecode(token);
      return decoded?.is_partner_role;

    } else {
      throw new Error('Unable to find token or api key');
    }
  } catch (err) {
    return false;
  }
}

export function checkInternalUser(email: string): boolean {
  return email.includes('@e2enetworks.com');
}

export const { logout } = authSlice.actions;
export default authSlice.reducer;
