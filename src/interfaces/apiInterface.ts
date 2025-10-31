  export enum ApiStatusCode {
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
  }
  
  export interface ApiResponse<T> {
    code: number;
    message: string;
    data?: T;
    error?: string | object;
    total_page_number?: number;
    total_count?: number;
  }
  
  export interface PaginationParams {
    page_no: number;
    per_page: number;
  }
  
  export interface PaginationWithSearchParams {
    page_no: number;
    per_page: number;
    email?: string;
  }