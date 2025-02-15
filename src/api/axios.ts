import axios from "axios";

// 创建 axios 实例
const instance = axios.create({
  // 使用相对路径，让它自动匹配当前域名
  baseURL: "",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default instance;
