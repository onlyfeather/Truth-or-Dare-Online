import axios from 'axios';

// 🟢 智能处理：防止环境变量里多填了斜杠或 /api
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, ''); // 去掉末尾所有的斜杠

// 确保只加一个 /api
const baseURL = cleanBaseUrl.endsWith('/api') ? cleanBaseUrl : `${cleanBaseUrl}/api`;

const api = axios.create({
  baseURL,
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('admin_auth_token');
      if (window.location.pathname.includes('/admin')) {
        window.location.reload(); 
      }
    }
    return Promise.reject(error);
  }
);

export default api;