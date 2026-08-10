import axios from "axios";

// apiHttp 统一承载浏览器到 AI 服务的 HTTP 请求；开发环境由 Vite 将 /api 转发至服务端。
export const apiHttp = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
    headers: {
        Accept: "application/json",
    },
});
