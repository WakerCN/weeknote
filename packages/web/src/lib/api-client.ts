/**
 * API 客户端 - 带 Token 管理的 axios 实例
 */

import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

// Token 存储 key
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * 创建 axios 实例
 */
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Token 管理工具
 */
export const tokenManager = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

/**
 * 刷新 Token 的标志（防止并发请求重复刷新）
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

/**
 * 处理队列中的请求
 */
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

/**
 * 请求拦截器 - 添加 Authorization 头
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器 - 处理 401 错误和 Token 刷新
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    // 如果是 401 错误且不是刷新接口本身，尝试刷新 Token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // 如果正在刷新，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers!.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenManager.getRefreshToken();

      if (!refreshToken) {
        // 没有 refresh token，直接跳转登录
        tokenManager.clearTokens();
        window.location.href = '/auth';
        return Promise.reject(error);
      }

      try {
        // 刷新 Token
        const response = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken } = response.data;

        tokenManager.setTokens(accessToken, refreshToken);
        processQueue(null, accessToken);

        // 重试原请求
        originalRequest.headers!.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // 刷新失败，清除 Token 并跳转登录
        processQueue(refreshError as Error, null);
        tokenManager.clearTokens();
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 其他错误
    const status = error.response?.status;
    const url = originalRequest.url || '';
    const message =
      (error.response?.data as { error?: string })?.error || error.message || '请求失败';

    // 显示错误提示（排除某些不需要提示的接口）
    const shouldSuppressToast =
      // reminder 接口在本地/云端形态不同：云端没有 /reminder，会由上层自动 fallback 到 /config
      (status === 404 && url.startsWith('/reminder')) ||
      // 云端也没有 reminder test 接口，避免误导性 toast
      (status === 404 && url.startsWith('/reminder/test'));

    if (!url.includes('/auth/me') && !shouldSuppressToast) {
      toast.error(message);
    }

    // 透出 status/url，方便上层做 fallback
    const out = new Error(message) as Error & { status?: number; url?: string };
    out.status = status;
    out.url = url;
    return Promise.reject(out);
  }
);

export default apiClient;
