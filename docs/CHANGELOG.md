## CHANGELOG - 2026-08-10 01:46 - 调整对话消息的阅读层级

### 撰写时间

- 2026-08-10 01:46

### Base Commit

- b2f8d1d2dcf308f0f482445363fc47b64391bde5

### Compare Scope

- working_tree_only

### 背景与改动目标

当前聊天页中，用户消息与 assistant 回答都使用了气泡容器。短回答时层级清晰，但长回答被额外边框、阴影和固定宽度包裹，阅读重心容易被容器样式分散。因此这次只调整展示层级，不改变 `ChatArea` 的会话状态、Mock 流或输入交互。

### 改动概览

- 用户消息圆角由完全胶囊形态调整为 `22px`，保留右侧气泡语义，同时避免内容较长时两端过度圆润。
- assistant 消息移除容器背景、边框和阴影，改为占满可用宽度的纯文本区域，并统一为 `16px / 24px` 的阅读排版。
- `answer-text` 继承父级字号和行高，保证流式完成前后的最终文本样式一致。

### 关键链路解析（含上下游）

- 上游依赖：`ChatArea` 根据 `ChatTurn` 渲染 `.user-message`、`.assistant-message` 与 `.answer-text`；数据仍由 `submitQuestion` 和 `streamMockReply` 提供。
- 当前改动：仅修改 `ChatArea.css` 中上述选择器的尺寸、边框和文字样式，不触碰 TSX、事件映射或 `AbortSignal` 中止链路。
- 下游影响：聊天页面的长回答不再受气泡最大宽度和卡片视觉约束。测试继续覆盖输入、流式事件与中止行为，业务调用方无需同步修改。

### 改动结果与业务影响

当前界面在保留用户问题气泡辨识度的同时，让 assistant 文本以更连续的版式呈现。`pnpm check` 已通过：4 个测试文件、8 个用例、测试类型检查、lint 与生产构建均成功。

### 风险与待办

- 这次验证覆盖了行为和构建，没有进行真实设备上的视觉回归；仍建议在窄屏和超长回答场景下人工确认排版。
- Vite 仍提示主 JavaScript 包超过 500 kB，该提示与本次 CSS 改动无直接关系，后续可单独评估拆包。

### 建议 Commit Message（git-cz）

- `style(chat): simplify assistant message presentation`

## CHANGELOG - 2026-08-10 01:27 - 简化聊天首屏并同步输入链路测试

### 撰写时间

- 2026-08-10 01:27

### Base Commit

- b72e03a55516f72a177df298a1aa6c29127f0469

### Compare Scope

- working_tree_only

### 背景与改动目标

这次调整的重点是收紧聊天首页的入口。原页面同时维护品牌头部、欢迎文案和建议问题，但实际发起对话仍要落到输入框；因此我们改为直接展示空会话与输入区，把首屏交互收敛为“输入问题并发送”。

一开始，现有测试仍从已移除的建议问题按钮启动对话，导致 `pnpm test` 无法通过。最终没有回退新的页面结构，而是把测试、规范和实现统一到文本输入这条真实入口上。

### 改动概览

- `ChatArea` 移除品牌头部、欢迎面板与建议问题，空会话只保留消息列表和 `ChatInput`。
- 用户消息改用中性填充色和胶囊圆角；禁用发送按钮使用透明边框，保持输入区视觉一致。
- `ConfigProvider.theme.cssVar` 使用 `tongji-student-theme` 作为 CSS 变量命名 key，并将同名 class 挂在聊天根节点，避免主题变量与其他页面实例混用。
- `test/components/app.test.tsx` 与 `test/components/chat-area.test.tsx` 改为通过文本框输入、点击发送来覆盖流式展示和中止行为；`docs/UTSpec.md` 同步更新首屏测试契约。
- 清理已删除页面元素遗留的 `Title` 导入，恢复类型检查、lint 与生产构建。

### 关键链路解析（含上下游）

- 上游依赖：`App` 仍通过 `ConfigProvider` 向 `ChatArea` 和 `ChatInput` 提供 Ant Design token；`ChatInput` 的受控 `value` 与 `onSubmit` 是创建会话的唯一入口。
- 当前改动：用户填写文本后，`ChatArea.submitQuestion` 创建轮次并消费 `streamMockReply` 的事件；`ChatArea` 不再从 `suggestedQuestions` 调用同一函数。主题 key 由 `App` 传入，根节点 class 让业务 CSS 可定位到该主题实例。
- 下游影响：`ChatArea` 的用户可见首屏结构已改变，因此测试改为模拟真实输入和发送按钮。后续接入真实流式服务时，仍需保持 `ChatInput -> submitQuestion -> StreamEvent` 的数据流和停止语义。

### 改动结果与业务影响

当前首屏更聚焦，用户进入页面后可直接输入问题；消息、流式活动与中止行为未改变。测试不再依赖已删除的建议按钮，`pnpm check` 已验证 8 个用例、测试类型检查、lint 与生产构建均通过。

### 风险与待办

- 移除建议问题后，首屏缺少可发现性引导；如需帮助首次使用者，应以产品确认的引导文案或示例补回，而不是让测试继续依赖不存在的入口。
- 本次只验证离线 Mock 流。真实 SSE 的错误呈现、鉴权和网络中断仍需在服务适配层落地后补测。
- Vite 构建仍提示主 JavaScript 包超过 500 kB；这不是本次改动造成的阻塞项，但后续可评估按路由或功能拆包。

### 建议 Commit Message（git-cz）

- `refactor(chat): simplify initial input experience`

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
