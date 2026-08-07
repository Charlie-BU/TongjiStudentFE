# TongjiStudentFE

同济同学 Agent 的 React + Vite 前端。

## 本地配置

复制 `.env.example` 为 `.env.local`。默认配置通过 Vite 将 `/api` 代理到本机 `8080` 端口的 Agent：

```env
VITE_API_BASE_URL=/api
VITE_OAUTH_CALLBACK_PATH=/wallbreakerAuth/callback.html
VITE_DEV_API_TARGET=http://127.0.0.1:8080
```

生产环境建议由同源网关将 `/api` 反向代理到 Agent，避免聊天 API和 OAuth callback 引入额外 CORS 边界。

OAuth 回调路径必须与 Agent 的 `TONGJI_OPEN_PLATFORM_REDIRECT_URI` 保持一致。当前 Agent 默认约定为 `https://app.tongji.edu.cn/wallbreakerAuth/callback.html`，因此部署前需要确认该路径由本前端托管，或同时调整前后端配置。

## API 契约

- `src/api/contracts.ts`：Agent HTTP 与 SSE 类型。
- `src/api/client.ts`：统一 URL、Bearer Header 与 HTTP 错误处理。
- `src/api/auth.ts`：OAuth authorize/token。
- `src/api/sessions.ts`：健康检查、会话、历史和任务计划。

会话历史字段以 Agent 源码中的 snake_case JSON tag 为准。SSE 消息提交与流解析会在下一实施步骤接入。

## 命令

```bash
pnpm dev
pnpm lint
pnpm build
```
