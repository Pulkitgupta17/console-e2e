import axios from "axios";
import { jwtDecode, type JwtPayload } from "jwt-decode";
import { getCookie } from '@/services/commonMethods';
// import { logoutUser } from "./store/authSlice";

export const API = axios.create({
  baseURL: import.meta.env.VITE_apiURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const PublicAPI = axios.create({
  baseURL: import.meta.env.VITE_publicApiUrl,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

const isTokenExpired = (token: string | null) => {
  try {
    if (!token) return true;
    const decoded: JwtPayload = jwtDecode(token);
    return decoded;
  } catch (error: any) {
    return true;
  }
};

API.interceptors.request.use(
  async (config) => {
    const token = getCookie("token");
    const apiKey = getCookie("apikey");

    if (isTokenExpired(token)) {
    //   logoutUser();
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if(apiKey){
      config.params = config.params || {};
      config.params.apikey = apiKey;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
