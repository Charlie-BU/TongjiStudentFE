import type { AxiosRequestConfig } from "axios";
import TongjiStudentService from "../cam-auto-generate/TongjiStudent";
import axios from "axios";

const TONGJI_ACCESS_TOKEN_KEY = "tongji-access-token";

function getAuthorizationHeader(): Record<string, string> {
    const token = window.localStorage.getItem(TONGJI_ACCESS_TOKEN_KEY)?.trim();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export const tongjiStudentService =
    new TongjiStudentService<AxiosRequestConfig>({
        baseURL: import.meta.env.VITE_TONGJI_STUDENT_BASE_URL,
        request: (config, options) =>
            axios
                .request({
                    ...config,
                    ...options,
                    headers: {
                        ...config.headers,
                        ...options?.headers,
                        ...getAuthorizationHeader(),
                    },
                })
                .then((res) => res.data),
    });
