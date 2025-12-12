import { PublicAPI } from "@/axios";

export interface CountriesResponse {
  data?: {
    serving_countries: Record<string, any>;
    restricted_countries?: string[];
  };
  serving_countries?: Record<string, any>;
  restricted_countries?: string[];
}

export const getCountriesList = async (): Promise<CountriesResponse> => {
  const response = await PublicAPI.get("countries/");
  // Handle both response.data.data and response.data structures
  return response.data?.data || response.data;
};

