import axios from "axios";

// 创建 axios 实例
const instance = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000", // 默认本地开发地址
	timeout: 15000, // 请求超时时间
	headers: {
		"Content-Type": "application/json",
	},
});

// // 请求拦截器
// instance.interceptors.request.use(
// 	(config) => {
// 		// 从 localStorage 获取 token
// 		const token = localStorage.getItem("token");
// 		if (token) {
// 			config.headers.Authorization = `Bearer ${token}`;
// 		}
// 		return config;
// 	},
// 	(error) => {
// 		return Promise.reject(error);
// 	},
// );

// // 响应拦截器
// instance.interceptors.response.use(
// 	(response) => {
// 		return response.data;
// 	},
// 	(error) => {
// 		if (error.response) {
// 			switch (error.response.status) {
// 				case 401:
// 					// 未授权，清除 token 信息并跳转到登录页面
// 					localStorage.removeItem("token");
// 					// 可以在这里添加重定向到登录页的逻辑
// 					break;
// 				case 403:
// 					// 权限不足
// 					console.error("没有权限访问该资源");
// 					break;
// 				case 404:
// 					// 请求的资源不存在
// 					console.error("请求的资源不存在");
// 					break;
// 				default:
// 					console.error("发生错误:", error.response.data);
// 			}
// 		} else if (error.request) {
// 			// 请求已经发出，但没有收到响应
// 			console.error("网络错误，请检查您的网络连接");
// 		} else {
// 			// 发送请求时出错
// 			console.error("请求配置错误:", error.message);
// 		}
// 		return Promise.reject(error);
// 	},
// );

export default instance;
