## CHANGELOG - 2026-08-11 15:04 - 接入同济 OAuth 登录并增强 Markdown 回答渲染

### 撰写时间

- 2026-08-11 15:04

### Base Commit

- 9792e8f47d4676e5fc850f946d0b2f0f00aaf9f8

### Compare Scope

- working_tree_only

### 背景与改动目标

前一次更新已经让前端能读取本地保存的 Bearer token，但用户仍需要手工配置测试凭据，认证会话无法从页面自然建立。本次把登录入口、OAuth 回调、Token 保存和用户信息展示串成一条浏览器侧链路，同时保留 `401` 才清除 Token 的边界，避免临时网络错误把可用登录态误判为失效。

聊天内容此前只能呈现基础 Markdown。回答中出现表格、任务列表、公式或代码片段时，结构信息和可读性不足。因此本次为回答和推理区接入 GFM、数学公式、单换行与有限语言集的语法高亮，并为代码块补上复制交互。

### 改动概览

- `App` 按 `/oauth/callback` 分流到 `OauthCallback`；常规聊天页在挂载时通过 `UserBasicInfoGET` 获取用户基础信息，并将结果传给 `SessionSidebar`。
- 新增 `OauthCallback`：读取并清理 URL 中的 `code`、`state`，调用 `TongjiOauthTokenPOST` 换取 `access_token`，保存至 `localStorage["tongji-access-token"]` 后返回首页；相同授权码在 React `StrictMode` 下复用进行中的请求，避免重复兑换。
- `SessionSidebar` 在未登录时跳转 `/v1/tongji/oauth/authorize`；登录后展示姓名、学号和用户类型，并提供切换用户与退出登录菜单。`TestAccessTokenControl` 保存测试 Token 后改为刷新页面，使用户信息重新拉取。
- 新增 `remark-gfm`、`remark-breaks`、`remark-math`、`rehype-katex`、`katex` 和 `react-syntax-highlighter`，为回答及推理内容提供表格、任务列表、链接、公式、代码高亮与复制按钮；CSS 同步补齐窄容器、表格、公式横向滚动和代码块样式。
- 补充 OAuth 回调、用户信息读取、登录/退出菜单及扩展 Markdown 的组件测试，并更新锁文件。

### 关键链路解析（含上下游）

- 上游依赖：CAM 生成客户端已提供 `TongjiOauthTokenPOST` 与 `UserBasicInfoGET`，而 `tongjiStudentService` 会从同一 `localStorage` 键注入 `Authorization`。侧栏使用 `VITE_TONGJI_STUDENT_BASE_URL` 组装认证入口，开发环境可继续经 `/api` 代理访问服务端。
- 当前改动：授权平台回跳到 `/oauth/callback?code=...&state=...` 后，`OauthCallback` 先以 `history.replaceState` 移除敏感查询参数，再以 `code/state` 换取 Token。`ChatApp` 后续请求用户资料；只有服务端明确返回 `401` 才移除本地 Token。Markdown 则通过共享的 `markdownComponents` 同时作用于回答与推理内容，块级代码交给 `PrismLight` 渲染，行内代码保持原生 `<code>`。
- 下游影响：获得 Token 后，既有会话列表、历史恢复和 SSE 请求都会由服务适配器自动携带 Bearer 头，调用接口无需改签名。侧栏能据用户资料转换为登录菜单；无资料时仍可发起认证。渲染层只消费既有 `ChatTurn.answer` 与 `ChatTurn.reasoning`，不影响 SSE 事件模型。

### 改动结果与业务影响

浏览器侧已经具备从授权入口到持久化访问 Token、展示身份和退出登录的完整交互；Token 失效与短暂请求失败被区分处理。聊天回答可表达更完整的 Markdown 语义，代码块可识别常用语言并复制文本。

已执行 `git diff --check`，未发现空白字符错误。`pnpm test` 共运行 7 个测试文件、32 个用例，其中 31 项通过；OAuth 回调的成功、缺参、失败和 `StrictMode` 去重场景均已覆盖。

### 风险与待办

- `test/components/session-sidebar.test.tsx` 有 1 项失败：用例查询 `aria-label="同济统一身份认证登录"`，实现提供的是 `aria-label="同济统一身份认证"`。这会阻断完整测试通过；需统一实现与测试的无障碍名称后重新执行 `pnpm test`，再补跑 `pnpm check`。
- Access Token 仍存于 `localStorage`，应保持短期、低权限，并在生产安全评审中评估 XSS 暴露边界与替代存储方案。
- 未识别的 fenced code 语言会按 `text` 处理；当前没有动态加载语法包，后续若扩展语言集合，需要兼顾首屏包体积。

### 建议 Commit Message（git-cz）

- `feat(auth): add OAuth login and rich Markdown rendering`

## CHANGELOG - 2026-08-11 00:32 - 添加测试 Token 配置入口与请求鉴权注入

### 撰写时间

- 2026-08-11 00:32

### Base Commit

- 8a736cd60965742e4a7a6a057e621a63f2f452bf

### Compare Scope

- working_tree_only

### 背景与改动目标

会话侧栏已经能够读取持久会话接口，但本地联调时缺少一个可控的 Bearer token 输入边界。为了不把测试凭据写进代码或请求 fixture，本次把输入入口限定为 `TEST_ENV=true` 的测试构建，并让服务层在每次请求前从浏览器本地存储读取最新值。

按钮一开始固定在右下角。考虑到调试页面本身有输入区和移动端侧栏，入口也支持拖拽并在拖动后抑制 click，避免调整位置时误打开 Modal。

### 改动概览

- `vite.config.ts` 将 `TEST_` 前缀加入客户端环境变量白名单，`App` 仅在 `import.meta.env.TEST_ENV === "true"` 时装配 `TestAccessTokenControl`。
- 新增独立的 `TestAccessTokenControl`：圆形入口提供 Token 输入 Modal，保存时写入 `localStorage["tongji-access-token"]`，并支持限制在视口内的 Pointer Events 拖拽。
- `tongjiStudentService` 在请求构造阶段读取该本地值，并在保留调用方 headers 的同时附加 `Authorization: Bearer <token>`。
- 新增页面交互与服务层单测，覆盖 Token 保存、按钮拖拽不触发 Modal，以及 Bearer 请求头构造。
- `index.html` 同步将浏览器页面标题调整为“同济同学”，并移除未被页面引用的 `public/icons.svg`。

### 关键链路解析（含上下游）

- 上游依赖：`.env` 中的 `TEST_ENV` 决定 `App` 是否渲染调试入口；用户通过独立按钮输入虚构或联调 Token。
- 当前改动：组件将值保存到 `localStorage`，请求适配器在 `axios.request` 前读取同一键并合并 headers，因此保存后不需要重建 `tongjiStudentService` 或刷新页面。
- 下游影响：CAM 生成客户端和 `useChat` 的调用签名不变；会话列表、历史恢复和 SSE 请求都会经过同一服务适配器取得 Authorization 头。

### 改动结果与业务影响

在测试构建中，开发者可以手动配置和更新同济 Access Token，后续 API 请求会立即携带该 Token。`pnpm check` 已验证 6 个测试文件、20 个用例、测试类型检查、ESLint 与生产构建；`antd lint src` 和 `git diff --check` 也通过。

### 风险与待办

- 当前通过 `envPrefix: ['VITE_', 'TEST_']` 暴露变量。它比需求所需的单个 `TEST_ENV` 更宽，未来若 `.env` 增加 `TEST_*` 敏感值，可能被编译进客户端；应改为只显式注入布尔开关。
- Token 按需求存入 `localStorage`，因此仅应使用短期、测试用途的凭据；不要在共享浏览器配置高权限生产 Token。
- Vite 仍提示主 JavaScript 包超过 500 kB。本次没有改变现有拆包策略。

### 建议 Commit Message（git-cz）

- `feat(auth): add test token configuration`

## CHANGELOG - 2026-08-11 00:18 - 增加会话侧栏与历史恢复，并修复新建聊天竞态

### 撰写时间

- 2026-08-11 00:18

### Base Commit

- e408104bcd5b78a6e3e23ca3c339cff81970c30d

### Compare Scope

- working_tree_only

### 背景与改动目标

聊天页此前只承载当前浏览器生命周期内的一轮轮流式对话，用户无法从界面查看最近会话，也无法通过 URL 回到既有记录。本次把页面主线扩展为“会话路由 -> 历史恢复 -> 聊天展示”，并加入可折叠的会话侧栏和窄屏抽屉布局。

实现后复查发现一个边界：历史请求尚未完成时点击 New Chat，旧响应仍可能回填空白页。因此没有只依赖 `AbortController`，而是沿用恢复序号作为结果归属判断，让新聊天能够明确淘汰旧恢复结果。

### 改动概览

- 新增 `useSessionRoute`，将 `/session/:sessionId` 映射为当前会话，并支持侧栏选择、新建聊天和浏览器前进后退。
- 新增 `SessionSidebar`，请求最近会话、合并当前页面新创建的会话，并提供桌面可拖拽宽度和移动端抽屉入口。
- `useChat` 新增 `activeSessionId`、`restoreSession` 与 `startNewChat`，通过 `SessionMessagesGET` 恢复历史消息、工具活动和每轮耗时。
- `startNewChat` 会递增 `restoreSequenceRef`，使未完成的历史响应失效；`app.test.tsx` 覆盖恢复中点击 New Chat 后旧回答不可见。
- 聊天内容区改为独立滚动容器，输入框跟随内容宽度并避开滚动条；CAM 客户端同步会话列表、命名和消息历史接口定义。

### 关键链路解析（含上下游）

- 上游依赖：`App` 消费 `useSessionRoute.sessionId`，在路径变化时调用 `useChat.restoreSession` 或 `startNewChat`；`SessionSidebar` 只向上层发出选择和新建意图。
- 当前改动：`restoreSession` 为每次历史请求分配递增序号。New Chat 会推进该序号并清空当前展示，所以较早请求即使随后返回，也无法通过结果归属校验并写入 `turns`。
- 下游影响：`ChatArea` 继续只消费 `ChatController`，因此流式渲染、工作时长和输入组件无需感知路由或历史接口。新增的回归用例守住了路由切换时的页面状态边界。

### 改动结果与业务影响

当前页面可以通过会话 URL 恢复最近 100 条历史消息，并在新建会话后立即更新侧栏与地址栏。会话恢复与 New Chat 的并发场景不再把旧回答显示到新聊天中。`pnpm check` 已验证 5 个测试文件、17 个用例、测试类型检查、ESLint 与生产构建。

### 风险与待办

- 会话列表与持久会话创建目前仍以空请求调用。接口契约要求 Bearer token 才能列出用户持久会话；该认证接入问题已按本次指示暂时豁免，后续应统一注入 OAuth token 后再开放跨刷新历史能力。
- Vite 仍提示主 JavaScript 包超过 500 kB。本次没有改变拆包策略，后续可按需加载 Markdown 或会话侧栏模块。

### 建议 Commit Message（git-cz）

- `feat(chat): add session sidebar and history restore`

## CHANGELOG - 2026-08-10 20:06 - 接入 CAM/Axios SSE 聊天服务并移除运行时 Mock

### 撰写时间

- 2026-08-10 20:06

### Base Commit

- b48cb30ae70a1fdec744a7b4148780912bd6579b

### Compare Scope

- working_tree_only

### 背景与改动目标

聊天页此前仅消费本地异步生成器，无法创建真实会话或展示服务端 SSE 返回。CAM 已生成同济学生服务的 OpenAPI 客户端，并由 `tongjiStudentService` 对外导出。本次改动将聊天主链路替换为 Hook 驱动的服务端会话与 SSE 流，并同步清理运行时 Mock 数据。

### 改动概览

- `tongjiStudentService` 支持透传 Axios 请求选项，开发环境通过既有 `/api` Vite Proxy 请求 AI 服务。
- 新增 `useChat`：集中管理输入、会话创建和复用、SSE 消费、取消、失败态与消息轮次。
- POST 消息接口通过 `tongjiStudentService.SessionMessagesPOST` 调用，使用 Axios XHR 下载进度消费 SSE，支持分块解帧、事件映射、取消、失败态及按 `seq` 去重。
- `ChatArea` 改为只消费 `useChat` 返回的状态和操作，不再依赖本地 Mock 流或服务依赖注入。
- 删除 `mock-stream.ts` 及其专属测试；测试通过注入网关替身隔离网络，运行时不再包含模拟回答。
- 更新工作过程标题状态、输入区滚动安全区和 Markdown 内容排版；Markdown 正文保持 16px，并将块内行高调整为 28px。
- 将 CAM 生成目录排除在 ESLint 业务代码检查外，避免修改只读生成代码以适配手写规则。

### 关键链路解析（含上下游）

- 上游依赖：`ChatInput` 提交问题到 `useChat.submitQuestion`，Hook 创建 `AbortController` 并在首轮调用 `tongjiStudentService.SessionPOST()`。
- 当前改动：Hook 通过 `tongjiStudentService.SessionMessagesPOST()` 请求 `POST /v1/sessions/:session_id/messages`；下载进度中的 SSE 事件被解析为 `agent.status`、`assistant.reasoning`、`assistant.delta`、工具调用和 run 事件，再投影为 `ChatTurn` 状态。
- 下游影响：`ChatArea` 只渲染 Hook 提供的状态。用户停止生成时，同一 `AbortSignal` 会中止 Axios 请求并将本轮标记为已停止。

### 改动结果与业务影响

ChatBot 已可在匿名会话下创建服务端 session 并消费真实 SSE 回答；服务端异常会转化为可见失败标题，重复或倒序事件不会重复写入页面。`useChat` 和 ChatArea 分别具备独立测试边界，后续认证、历史恢复及任务计划展示可在 Hook 中扩展。

### 风险与待办

- CAM 事件的 `data` 仍声明为 `any`；当前适配层已兼容常见字段名，待服务端确认各事件载荷后应收紧运行时校验。
- 当前实现以匿名会话为默认路径；同济 OAuth token 的获取、存储和 `Authorization` 注入尚未接入。
- Axios fetch adapter 依赖浏览器的 `ReadableStream` 支持，发布前应在目标浏览器环境验证 SSE 连接和取消行为。
- Vite 仍提示主 JavaScript 包超过 500 kB，未因本次接入阻塞构建；可在后续评估按需加载 Markdown 或聊天模块。

### 验证结果

- `pnpm test`：4 个测试文件、11 个用例通过。
- `pnpm test:typecheck`、`pnpm lint`、`pnpm build` 与 `git diff --check` 通过。

### 建议 Commit Message（git-cz）

- `feat(chat): connect chatbot to CAM SSE service`

## CHANGELOG - 2026-08-10 18:08 - 支持 Markdown 流式回答与工作过程展示

### 撰写时间

- 2026-08-10 18:08

### Base Commit

- efd671142e43995c95f5999b472753b1150c6cd2

### Compare Scope

- working_tree_only

### 背景与改动目标

此前聊天页把 Agent 回答和工作说明作为纯文本渲染，换行可以保留，但标题、列表等结构信息会丢失。与此同时，固定输入栏会遮挡对话末尾，工作过程的视觉层级也不够接近最终回答。此次改动的目标是让流式消息保留 Markdown 语义，并将滚动终点、活动区和输入区的布局收敛到同一阅读节奏。

### 改动概览

- 新增 `react-markdown`，在 `ChatArea` 中渲染 assistant 最终回答与 reasoning 的 Markdown 标题、段落和列表。
- 调整活动区：以 `SearchOutlined` 表示检索条目，按回答状态显示“正在准备回答… / 正在工作 / 工作过程”，并简化 `Collapse` 的边框与内边距。
- 为聊天底部预留 `--chat-input-clearance`，将其同时用于会话底部 padding 和 `scroll-margin-bottom`，使自动滚动终点避开固定输入栏。
- 扩展输入框最大宽度，并同步对话消息、活动区和 Markdown 正文的排版样式。
- 增加 Markdown 渲染与自动滚动测试；`pnpm check` 覆盖 10 个离线用例并通过。

### 关键链路解析（含上下游）

- 上游依赖：`ChatInput` 将受控文本提交给 `ChatArea.submitQuestion`；该函数仍按轮次消费 `streamMockReply` 的 `StreamEvent`。
- 当前改动：`delta` 累积到 `ChatTurn.answer` 后交由 `ReactMarkdown` 展示；`reasoning` 在活动折叠区使用同一渲染器。`conversationEndRef` 对应的节点新增滚动安全区，仍在 `turns` 更新后调用 `scrollIntoView`。
- 下游影响：消息内容现在以 Markdown DOM 结构提供给页面和辅助技术；测试将断言标题和列表，而不再把回答当作单一纯文本节点。真实 SSE 接入时仍只需产生现有事件类型。

### 改动结果与业务影响

当前聊天回答可展示层级化文本，工作过程与最终回答使用一致的阅读语义；滚动位置与固定输入栏不再直接重叠。构建、lint、测试类型检查及 10 个单元测试均已通过。

### 风险与待办

- `react-markdown` 使生产主包增加约 113 kB（约 34 kB gzip）。该问题已登记在 `.codex/skills/commit-quality-reviewer/docs/whitelist.md`，作为 Markdown 展示能力的临时权衡，失效时间为 2026-09-10；届时应结合真实性能数据评估拆包或按需加载。
- 当前只验证离线 Mock 流；真实 SSE 的错误、鉴权和网络中断仍需在服务适配层完成后补测。

### 建议 Commit Message（git-cz）

- `feat(chat): render streaming messages as markdown`

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
