# 前端单元测试规则

## 规范来源

- 单元测试的唯一项目规范是仓库根目录的 [docs/UTSpec.md](../../docs/UTSpec.md)。
- 该文档定义本 React + Vite 前端的测试栈、目录、Mock 边界、SSE/认证测试、校园数据脱敏、分层覆盖重点和提交前本地闭环。

## 强制要求

- 新增、修改、审阅或重构手写 TypeScript 逻辑、React 组件、会话状态、SSE/API 适配、认证/存储边界或测试配置前，必须先阅读 `docs/UTSpec.md` 并按其编写或更新 `.test.ts` / `.test.tsx` 用例。
- 测试统一置于仓库根目录 `test/`，不得与 `src/` 源码混放，也不得修改或深度 mock CAM 管理的 `src/cam-auto-generate/`。
- 测试必须离线、确定性且使用虚构脱敏数据；禁止真实 Access Token、Cookie、学生数据、校园平台、Agent 服务或外网调用。
- 当前测试基线尚未接入。首次新增带逻辑的模块或组件时，必须同时按 `docs/UTSpec.md` 接入 Vitest + jsdom + React Testing Library、补齐最小测试配置与受影响用例。
- 接入测试后，完成改动必须执行 `pnpm test`、`pnpm test:typecheck`、`pnpm lint` 和 `pnpm build`；也可使用 `pnpm check` 一次完成。失败不得标记为通过。
