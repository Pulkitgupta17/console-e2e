import { type ApiResponse, type PaginationWithSearchParams } from "@/interfaces/apiInterface";
import { PublicAPI } from "@/axios";

export const login = async (email: string, password: string): Promise<ApiResponse<any>> => {
    try {
        const response = await PublicAPI.post("/login", { email, password });
        return response.data;
    } catch (error) {
        console.error(error || "Something went wrong while logging in");
        throw error;
    }
}