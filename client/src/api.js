import axios from 'axios';

// 基础 URL 加上 /api 后缀
const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000') + '/api';

const api = axios.create({
  baseURL,
  timeout: 10000,
});

// 请求拦截器：自动带上 Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：简化数据返回，处理 401
api.interceptors.response.use(
  response => response.data, // 直接返回 data，不用每次都 .data
  error => {
    if (error.response && error.response.status === 401) {
      // Token 过期或无效
      localStorage.removeItem('admin_auth_token');
      // 可以选择跳转到登录页，或者由组件处理
      if (window.location.pathname.includes('/admin')) {
         window.location.reload(); 
      }
    }
    return Promise.reject(error);
  }
);

export default api;