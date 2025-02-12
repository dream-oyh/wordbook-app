import axios from "axios";

// 创建 axios 实例
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000", // 默认本地开发地址
  timeout: 15000, // 请求超时时间
  headers: {
    "Content-Type": "application/json",
  },
});

export default instance;
