## CHANGELOG - 2026-08-10 01:07 - 建立 Mock 流式校园问答与前端测试基线

### 撰写时间

- 2026-08-10 01:07

### Base Commit

- c4d20dd23c77a6d0be0c2aa144f41800253b3eaf

### Compare Scope

- working_tree_only

### 背景与改动目标

项目此前仍是 Vite + Ant Design 的默认页面，缺少可用于联调前演示的对话入口，也没有前端单元测试运行链路。此次先用离线、确定性的 Mock 流把“用户提问 -> Agent 工作过程 -> 最终回答 -> 用户中止”这条最小链路跑通；同时把交互契约固化为 Vitest 用例，避免后续接入真实 SSE 时没有回归边界。

### 改动概览

- 新增 `ChatArea`、`ChatInput` 与 `streamMockReply`，将默认页替换为校园问答界面，展示建议问题、工作过程、流式回答与停止生成状态。
- 在 `ChatInput` 中支持点击或 Enter 提交、Shift+Enter 换行，并通过 `event.nativeEvent.isComposing` 避免中文输入法确认候选词时误发送。
- 新增 `@ant-design/icons`；根部 `ConfigProvider` 开启 `cssVar`，将业务 CSS 的颜色和阴影改为 Ant Design token，设计种子值只保留在主题配置中。
- 接入 Vitest、jsdom 和 React Testing Library，增加测试命令、测试 TypeScript 配置、离线 jsdom stub，以及组件与 Mock 流的最小回归用例。
- 新增 `docs/UTSpec.md` 和 `.codex/rules/unit-testing.md`，明确测试目录、Mock 边界、SSE/认证隔离与提交前检查方式。

### 关键链路解析（含上下游）

- 上游依赖：`src/main.tsx` 装配 `App`；`App` 通过 `ConfigProvider` 提供 Ant Design 主题 token。`ChatArea` 消费受控的 `ChatInput` 值和 `streamMockReply(question, signal)` 产生的事件。
- 当前改动：`ChatArea.submitQuestion` 创建 `AbortController` 与会话轮次，并把 `status`、`reasoning`、工具事件和 `delta` 映射到 `ChatTurn`。`ChatInput` 在流式期间禁用文本输入，改为显示停止按钮；`stopStreaming` 通过同一 `AbortSignal` 终止 Mock 流。
- 下游影响：页面入口已由默认 Button 切换为聊天界面。测试层在 `test/components/` 覆盖首屏、流式展示、中止、输入提交和 IME 组合输入；未来真实 API/SSE 适配器应保持 `StreamEvent` 的消费语义，或同步更新组件与测试。

### 改动结果与业务影响

当前前端可以在不访问校园平台、Agent 服务或真实凭据的前提下演示一轮校园问答。Agent 中间过程与最终回答分开呈现，用户可主动停止生成；样式通过 `--ant-*` CSS 变量跟随主题配置，避免在组件 CSS 中继续散落硬编码颜色。

测试基线已具备 `pnpm test`、`pnpm test:typecheck`、`pnpm lint`、`pnpm build` 和 `pnpm check` 命令。现有测试数据均为虚构内容，`ResizeObserver` 与 `scrollIntoView` 仅使用 jsdom stub，不触发网络访问。

### 风险与待办

- 当前 `streamMockReply` 是演示数据，尚未覆盖真实 HTTP/SSE 的分帧、网络中断、鉴权或服务端错误映射；接入手写 API 适配器时应按 `docs/UTSpec.md` 补齐这些场景。
- `ChatArea` 目前只将用户主动中止映射为已停止状态；真实流接入前需明确非中止异常的用户可见错误状态与重试策略。
- 已新增单元测试，但仍应在提交前执行 `pnpm check`；视觉响应式和真实后端联调不属于当前离线单测范围。

### 建议 Commit Message（git-cz）

- `feat(chat): add mock streaming campus assistant`

