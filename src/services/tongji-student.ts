import type { AxiosRequestConfig } from "axios";
import TongjiStudentService from "../cam-auto-generate/TongjiStudent";
import axios from "axios";

export const tongjiStudentService =
    new TongjiStudentService<AxiosRequestConfig>({
        baseURL: import.meta.env.VITE_TONGJI_STUDENT_BASE_URL,
        request: (config, options) =>
            axios.request({ ...config, ...options }).then((res) => res.data),
    });
