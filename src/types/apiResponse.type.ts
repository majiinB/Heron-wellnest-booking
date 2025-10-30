/**
 * Standard API response type
 * @file apiResponse.type.ts
 * 
 * @description This type defines the standard structure for API responses in the application.
 * 
 * @author Arthur M. Artugue
 * @created 2025-08-28
 * @updated 2025-09-02
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  code: string;       
  message: string;    
  data?: T;     
  details?: unknown       
}
  