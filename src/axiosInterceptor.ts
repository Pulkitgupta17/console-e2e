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

      if (status === ApiStatusCode.UNAUTHORIZED) {
        console.log("calling logoutUser");
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
};
