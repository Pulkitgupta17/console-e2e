import { type ApiResponse } from "@/interfaces/apiInterface";
import { PublicAPI } from "@/axios";

export const login = async (
  email: string, 
  password: string, 
  recaptcha: string, 
  version: 'v2' | 'v3'
): Promise<ApiResponse<any>> => {
    try {
        const response = await PublicAPI.post("accounts/login/", { 
          email, 
          password, 
          recaptcha,
          version
        });
        return response.data;
    } catch (error) {
        console.error(error || "Something went wrong while logging in");
        throw error;
    }
}