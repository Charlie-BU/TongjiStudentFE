import type { AxiosRequestConfig } from "axios";
import TongjiStudentService from "../../cam-auto-generate/TongjiStudent";
import { apiHttp } from "../http";

// camClient 是生成客户端唯一的业务侧入口，避免上层依赖生成方法和响应字段。
const camClient = new TongjiStudentService<AxiosRequestConfig>({
    request: (config) => apiHttp.request(config).then((response) => response.data),
});

export type ApiSession = {
    id: string;
    persistence: "ephemeral" | "durable";
};

// createApiSession 将 CAM 生成响应转换为稳定的应用会话模型。
export async function createApiSession(): Promise<ApiSession> {
    const response = await camClient.SessionPOST({});

    return {
        id: response.session_id,
        persistence:
            response.persistence === "durable" ? "durable" : "ephemeral",
    };
}
