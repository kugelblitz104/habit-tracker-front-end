import { OpenAPI } from '@/api';
import { Refresh } from '@/features/auth/api/refresh';
import axios from 'axios';

// Configure the OpenAPI generated client
declare const __API_BASE_URL__: string;
OpenAPI.BASE = __API_BASE_URL__;

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url?.includes('/auth/refresh')) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');

            if (refreshToken) {
                if (!isRefreshing) {
                    isRefreshing = true;
                    refreshPromise = Refresh({
                        refresh_token: refreshToken
                    })
                        .then((response) => {
                            const { access_token, refresh_token: newRefreshToken } = response;
                            localStorage.setItem('access_token', access_token);
                            localStorage.setItem('refresh_token', newRefreshToken);
                            OpenAPI.TOKEN = access_token;
                            return access_token;
                        })
                        .catch((err) => {
                            console.error('Token refresh failed:', err);
                            localStorage.removeItem('access_token');
                            localStorage.removeItem('refresh_token');
                            localStorage.removeItem('user');
                            window.location.href = '/login';
                            throw err;
                        })
                        .finally(() => {
                            isRefreshing = false;
                            refreshPromise = null;
                        });
                }

                try {
                    const token = await refreshPromise;
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return axios(originalRequest);
                } catch (err) {
                    return Promise.reject(err);
                }
            }
        }
        return Promise.reject(error);
    }
);
