import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Configuration for API endpoints based on environment
 */
interface ApiConfig {
  checkoutBaseUrl: string;
  shrineBaseUrl: string;
  aciBaseUrl: string;
  headers: {
    default: Record<string, string>;
    checkout: Record<string, string>;
    shrine: Record<string, string>;
    aci: Record<string, string>;
  };
}

/**
 * Get the base URL for Checkout API based on environment
 */
function getCheckoutBaseUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.NODE_PORT || '4001';
    return `http://127.0.0.1:${port}`;
  }
  return 'https://checkout.ac';
}

/**
 * Get the base URL for Shrine API
 */
function getShrineBaseUrl(): string {
  return 'https://checkout.theshrine.net';
}

/**
 * Get the base URL for ACI API
 */
function getAciBaseUrl(): string {
  return 'https://aci-api.ashhhleyyy.dev';
}

/**
 * Get API configuration based on environment
 */
export function getApiConfig(): ApiConfig {
  return {
    checkoutBaseUrl: getCheckoutBaseUrl(),
    shrineBaseUrl: getShrineBaseUrl(),
    aciBaseUrl: getAciBaseUrl(),
    headers: {
      default: {
        'User-Agent': 'JEM/CheckOut (v3; +https://checkout.ac/support; abuse@jemedia.xyz)',
      },
      checkout: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'JEM/CheckOut (v3; +https://checkout.ac/support; abuse@jemedia.xyz)',
      },
      shrine: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'JEM/CheckOut (v3; +https://checkout.ac/support; abuse@jemedia.xyz)',
      },
      aci: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'JEM/CheckOut (v3; +https://checkout.ac/support; abuse@jemedia.xyz)',
      }
    }
  };
}

/**
 * Build a complete URL for the Checkout API
 */
export function buildCheckoutUrl(path: string): string {
  const baseUrl = getApiConfig().checkoutBaseUrl;
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
}

/**
 * Build a complete URL for the Shrine API
 */
export function buildShrineUrl(path: string): string {
  const baseUrl = getApiConfig().shrineBaseUrl;
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
}

/**
 * Build a complete URL for the ACI API
 */
export function buildAciUrl(path: string): string {
  const baseUrl = getApiConfig().aciBaseUrl;
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
}

/**
 * Make a GET request to the Checkout API
 */
export async function fetchFromCheckout<T = any>(path: string, apiKey: string | null = null): Promise<T | null> {
  const url = buildCheckoutUrl(path);
  const config: AxiosRequestConfig = {
    headers: { ...getApiConfig().headers.checkout }
  };
  
  if (apiKey) {
    config.headers!['x-checkout-key'] = apiKey;
    // console.log(`Using API key for Checkout request to ${path}`);
  } else {
    // console.log(`No API key provided for Checkout request to ${path}`);
  }
  
  try {
    const response = await axios.get<T>(url, config);
    
    // Log response summary
    if (response.data) {
      if (typeof response.data === 'object') {
        // For objects, log a summary of the structure
        const summary = {
          type: 'object',
          hasSessionsArray: Array.isArray((response.data as any).sessions),
          sessionsLength: Array.isArray((response.data as any).sessions) ? (response.data as any).sessions.length : 'N/A',
          keys: Object.keys(response.data)
        };
        // console.log(`Checkout API response summary:`, summary);
      } else {
        // console.log(`Checkout API response type: ${typeof response.data}`);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching from Checkout API (${url}):`, error);
    return null;
  }
}

/**
 * Make a POST request to the Checkout API
 */
export async function postToCheckout<T = any>(path: string, data: any, apiKey: string | null = null): Promise<AxiosResponse<T> | null> {
  const url = buildCheckoutUrl(path);
  const config: AxiosRequestConfig = {
    headers: { ...getApiConfig().headers.checkout }
  };
  
  if (apiKey) {
    config.headers!['x-checkout-key'] = apiKey;
  }
  
  try {
    const response = await axios.post<T>(url, data, config);
    return response;
  } catch (error) {
    console.error(`Error posting to Checkout API (${url}):`, error);
    return null;
  }
}

/**
 * Make a GET request to the Shrine API
 */
export async function fetchFromShrine<T = any>(path: string): Promise<T | null> {
  const url = buildShrineUrl(path);
  const config: AxiosRequestConfig = {
    headers: { ...getApiConfig().headers.shrine }
  };
  
  try {
    const response = await axios.get<T>(url, config);
    
    // Log response summary
    if (response.data) {
      if (Array.isArray(response.data)) {
        // console.log(`Shrine API response: Array with ${response.data.length} items`);
      } else if (typeof response.data === 'object') {
        // console.log(`Shrine API response: Object with keys ${Object.keys(response.data).join(', ')}`);
      } else {
        // console.log(`Shrine API response type: ${typeof response.data}`);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching from Shrine API (${url}):`, error);
    return null;
  }
}

/**
 * Make a POST request to the Shrine API
 */
export async function postToShrine<T = any>(path: string, data: any): Promise<AxiosResponse<T> | null> {
  const url = buildShrineUrl(path);
  const config: AxiosRequestConfig = {
    headers: { ...getApiConfig().headers.shrine }
  };
  
  try {
    const response = await axios.post<T>(url, data, config);
    return response;
  } catch (error) {
    console.error(`Error posting to Shrine API (${url}):`, error);
    return null;
  }
}

/**
 * Make a GET request to the ACI API
 */
export async function fetchFromAci<T = any>(path: string): Promise<T | null> {
  const url = buildAciUrl(path);
  const config: AxiosRequestConfig = {
    headers: { ...getApiConfig().headers.aci }
  };
  
  try {
    const response = await axios.get<T>(url, config);
    
    // Log response summary
    if (response.data) {
      if (Array.isArray(response.data)) {
        // console.log(`ACI API response: Array with ${response.data.length} items`);
      } else if (typeof response.data === 'object') {
        // console.log(`ACI API response: Object with keys ${Object.keys(response.data).join(', ')}`);
      } else {
        // console.log(`ACI API response type: ${typeof response.data}`);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching from ACI API (${url}):`, error);
    return null;
  }
}

/**
 * Generate a random token for Checkout API requests
 */
export function generateRandomToken(prefix: string = 'shrine'): string {
  const randomString = Array(16).fill(0).map(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }).join('');
  
  return prefix + randomString;
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
}

/**
 * Log API response with appropriate level
 */
export function logApiResponse(source: string, response: any, level: 'info' | 'error' = 'info'): void {
  if (level === 'error') {
    console.error(`Response from ${source}:`, response);
  } else {
    // console.log(`Response from ${source}:`, response);
  }
} 