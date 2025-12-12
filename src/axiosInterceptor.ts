import { type Store } from "@reduxjs/toolkit";
import API from "./axios";
import {type  ApiError, setApiError } from "./store/appState";
import { ApiStatusCode } from "@/interfaces/apiInterface";
import { logoutUser } from "@/store/authSlice";

export const setupAxiosInterceptors = (store: Store) => {
  API.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;
      let errorType: ApiError = "none";

      // Check for password_expired flag - redirect to password reset
      const passwordExpired = localStorage.getItem('password_expired');
      if (passwordExpired === 'true') {
        if (window.location.pathname !== '/accounts/password-reset') {
          window.location.href = '/accounts/password-reset';
        }
        return Promise.reject(error);
      }

      if (status === ApiStatusCode.UNAUTHORIZED) {
        logoutUser();
      } else if (status === ApiStatusCode.FORBIDDEN) {
        errorType = "forbidden";
      } else if (status && status >= 500 && status < 600) {
        errorType = "serverError";
      }

      store.dispatch(setApiError(errorType));
      return Promise.reject(error);
    }
  );

  // Request interceptor - redirect if password_expired while making requests (except password change API)
  API.interceptors.request.use(
    (config) => {
      const passwordExpired = localStorage.getItem('password_expired');
      if (passwordExpired === 'true' && !config.url?.includes('password-policy-api/password/change') && !config.url?.includes('logout')) {
        if (window.location.pathname !== '/accounts/password-reset') {
          window.location.href = '/accounts/password-reset';
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};
