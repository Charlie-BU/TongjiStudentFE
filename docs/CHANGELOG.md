## CHANGELOG - 2026-08-19 14:56 - 增加限流重试并锁定生成中的会话切换

### 撰写时间

- 2026-08-19 14:56

### Base Commit

- 9d5761b781a416e8f8c0d2c6075418cd311dc250

### Compare Scope

- working_tree_only

### 背景与改动目标

聊天请求遇到服务端限流时，原来的 `run.failed` 会直接结束当前轮次，用户只能手工重新发送；与此同时，流式生成尚未结束时切换或新建会话，容易让用户误以为当前回答已经完成。

这次把目标收敛为两件事：对明确标记为 HTTP `429` 的运行失败做有限次数的自动重试，并在这段生成生命周期内锁住会话切换入口。这里没有改变建会话、认证或 SSE 协议，只在 `useChat` 的事件投影与侧栏交互层加入可取消的保护。

### 改动概览

- `useChat` 读取 `run.failed` 的 `status_code/statusCode`；仅当值为 `429` 时，最多等待 3 秒后自动重试 3 次，超过上限后展示“模型请求次数超限，请稍后重试。”。
- 抽出 `streamQuestion` 承担单次 SSE 消费，重试前清空本次尚未完成的回答与推理、完成已有活动，并写入当前重试进度；`waitForRateLimitRetry` 监听同一 `AbortSignal`，已取消时立即返回。
- `SessionSidebar` 在存在 `streamingSessionId` 时禁用 New Chat 与非当前会话选择按钮，并通过 `Tooltip` 说明需要等待当前会话完成；当前会话及既有删除禁用逻辑保持原语义。
- 新增回归测试：覆盖 429 的三次重试与最终失败、重试等待期间的停止生成、生成期间新建/切换会话无副作用及提示文案；测试统一在 `afterEach` 恢复 fake timer。

### 关键链路解析（含上下游）

- 上游依赖：`tongjiStudentService.SessionMessagesPOST` 仍通过 XHR 下载进度提供 SSE 文本；`mapServerEvent` 将服务端 `run.failed` 映射为带可选状态码的内部事件。`App` 继续把 `useChat.isStreaming` 对应的 session id 传给 `SessionSidebar`。
- 当前改动：`submitQuestion -> streamQuestion` 在一次流结束后判断是否收到 429。若需要重试，仍复用同一个 session、问题文本和 `AbortController`；等待阶段用户点击停止会触发同一 signal，使等待函数清理 timer 并让当前轮进入 `aborted` 状态。
- 下游影响：非 429 的失败仍走原有通用失败文案；完成事件、工具活动、历史恢复、会话删除和路由选择的调用签名没有变化。侧栏只阻止流式期间的新建或跨会话切换，不改变认证用户和匿名会话的数据源。

### 改动结果与业务影响

在服务端明确返回 429 的边界下，前端会向用户展示等待重试进度，而不是立刻丢弃问题。用户仍可随时停止，停止后不会在计时器到期时发出额外请求。生成中会话的 New Chat 与其他会话按钮不可点击，减少状态切换造成的上下文误解。

重试次数和等待时长目前是固定的 `3 × 3 秒`，没有引入指数退避、服务端 `Retry-After` 解析或跨标签页协调；这些能力需要服务端协议和产品策略共同确认后再扩展。

### 验证结果

- `./node_modules/.bin/vitest run test/components/chat-area.test.tsx test/components/session-sidebar.test.tsx`：2 个测试文件、22 个用例通过。
- `./node_modules/.bin/vitest run`：8 个测试文件、45 个用例全部通过。
- 本地 `tsc --noEmit -p tsconfig.test.json`、ESLint 与 `git diff --check`：通过。
- `pnpm` 命令在当前无 TTY 环境下要求交互式清理并重建 `node_modules`，因此未自动执行该破坏性操作。直接调用本地 Vite 构建仍失败：`react-syntax-highlighter` 无法解析 `highlight.js/lib/languages/sql_more`；该依赖未在本次 diff 中变更，生产构建尚未完成验证。

### 风险与待办

- 自动重试只识别 SSE `run.failed` 携带的数值 `429`。若后端改为 HTTP 层直接返回错误、使用字符串状态码或提供 `Retry-After`，需要同步扩展适配与测试。
- 固定间隔可能在持续限流时产生额外负载；后续应结合服务端配额、退避策略与可观测性数据决定是否改为指数退避。
- 生成期间目前仍保留当前会话的操作菜单；应在真实浏览器中确认 Tooltip 在键盘和触控设备上的可发现性，并结合产品规则确认哪些菜单操作应一并禁用。
- 构建依赖解析问题需要独立处理并重新执行 `pnpm build`；恢复前不能将本次变更标记为生产构建已通过。

### 建议 Commit Message（git-cz）

- `feat(chat): retry rate-limited requests safely`

## CHANGELOG - 2026-08-19 13:47 - 完善聊天消息元信息与会话操作入口

### 撰写时间

- 2026-08-19 13:47

### Base Commit

- 8219778eb21be1b694229fd96055cb7c3ae52a33

### Compare Scope

- working_tree_only

### 背景与改动目标

上一轮欢迎页和登录引导落地后，聊天页仍缺少对已发送问题、最终回答的轻量操作入口；用户需要复制内容或判断消息时间时，只能手工选择文本。会话侧栏的重命名、删除也仍依赖右键菜单，在触控设备和不熟悉该交互的用户面前不够直接。

这次的目标因此不是改动 `useChat` 的建会话、SSE 或恢复语义，而是在既有消息与会话数据之上补齐可见的操作层：消息悬浮元信息、三点菜单、预留输入能力提示，以及欢迎页和主题的一组小幅视觉收口。同时同步修正了改动过程中暴露出的删除菜单回归测试，并补上复制降级路径的测试。

### 改动概览

- `ChatArea` 将用户问题和有最终文本的 assistant 回答拆为 `UserMessage`、`AssistantMessage` 与 `MessageCopyMeta`：每条消息展示发送时间，并提供“复制问题”或“复制回答”按钮；复制成功后短暂切换为已复制状态。
- 复制逻辑收敛为 `copyText`：优先使用 `navigator.clipboard.writeText`，不可用或写入失败时继续使用临时 textarea 与 `document.execCommand("copy")` 回退。原代码块复制也复用这条路径。
- `SessionSidebar` 从右键 `Dropdown` 改为每条认证会话右侧的三点按钮；保留重命名、删除、流式会话删除禁用和删除确认逻辑，并把菜单文案调整为“删除会话”。
- `ChatInput` 为尚未实现的提及和附件按钮增加“敬请期待”提示；`WelcomePage` 更新推荐问题、图标和登录标签色，样式层补齐消息元信息、分隔线、图标尺寸与侧栏悬浮操作的视觉规则。
- 新增 `@arco-design/web-react` 与 `add` 直接依赖，并同步更新 `pnpm-lock.yaml`；当前代码以 Arco 的 `IconCode`、`IconCopy` 渲染聊天区图标。
- `test/components/session-sidebar.test.tsx` 同步删除菜单的新文案；`test/components/chat-area.test.tsx` 新增问题/回答复制、时间元素和 Clipboard 回退的离线回归用例。

### 关键链路解析（含上下游）

- 上游依赖：`ChatArea` 继续只消费 `useChat` 输出的 `turns`，其中 `question`、`answer` 和 `startedAt` 是新增展示所需的现有字段；`SessionSidebar` 继续由 `userBasicInfo` 决定是否显示服务端会话操作，并由 `streamingSessionId` 决定删除是否禁用。
- 当前改动：`turns` 渲染时把问题和回答传入消息展示组件，`MessageCopyMeta` 按消息类型决定按钮与时间的排列。复制完成后通过本地 timer 恢复按钮文案；组件卸载时清理 timer。侧栏在单条会话的行容器中保留会话选择按钮，并把 `Dropdown` 的触发点收敛为独立的三点按钮，避免点击操作入口切换当前会话。
- 下游影响：`useChat.submitQuestion`、SSE 事件投影、`SessionDeleteDELETE` 和删除确认 Modal 的调用契约均未修改。用户提交推荐问题后，`WelcomePage -> ChatInput -> useChat` 的既有路径保持不变；新增测试使用 service Fake 和浏览器 API stub，不访问真实 Agent、认证服务或学生数据。

### 改动结果与业务影响

聊天消息在悬浮或键盘聚焦时会显示复制入口与时间，用户可以复制原始问题或 Markdown 渲染前的回答文本。代码块也使用同一复制降级逻辑，因此受限浏览器中仍会尝试兼容路径。侧栏把会话操作显式暴露为三点菜单，生成中的会话仍不能删除，认证与匿名会话的数据来源和选择行为不变。

这次没有调整服务端协议、路由格式或会话状态模型，影响集中在客户端呈现与交互层。代价是新增了 Arco 组件库和 `add` 依赖；其中 `add` 当前未见业务代码导入，且项目已经拥有 Ant Design 图标依赖，后续应确认是否确有保留这两项依赖的必要。

### 验证结果

- `pnpm exec vitest run test/components/chat-area.test.tsx test/components/session-sidebar.test.tsx`：2 个测试文件、19 个用例通过。
- `pnpm test`：8 个测试文件、42 个用例全部通过。
- `pnpm test:typecheck` 与 `pnpm lint`：通过；`git diff --check`：通过。
- `pnpm build`：未通过。Vite/Rolldown 在 `react-syntax-highlighter` 的 `async-languages/hljs.js` 中无法解析 `highlight.js/lib/languages/sql_more`。该错误发生在依赖解析阶段，本次没有修改对应的聊天语法高亮源码；在此问题处理前，生产构建仍未完成验证。

### 风险与待办

- 当前消息复制按钮主要通过 hover 和 `:focus-within` 显示。触控设备缺少 hover，仍应在真实移动端检查按钮发现性与触控区域。
- `formatMessageTime` 以浏览器本地日期判断“当天”，跨时区、夏令时或服务端时间戳异常时可能产生与用户预期不一致的文案；本次仅验证了时间元素和时间戳属性，尚未覆盖这些边界。
- `@arco-design/web-react` 仅用于两个图标，而 `add` 尚无代码引用；应在合并前移除无用依赖，或明确其产品与技术必要性，并重新检查包体积与锁文件变更。
- 生产构建的 `sql_more` 解析失败需要单独定位依赖版本与 Vite/Rolldown 兼容性；同时主 JavaScript bundle 仍超过 500 kB，构建恢复后应再评估拆包方案。

### 建议 Commit Message（git-cz）

- `feat(chat): add message copy and session action menu`

## CHANGELOG - 2026-08-19 03:23 - 新增欢迎页与登录提醒，并完善侧栏和代码复制体验

### 撰写时间

- 2026-08-19 03:23

### Base Commit

- 8219778eb21be1b694229fd96055cb7c3ae52a33

### Compare Scope

- index_and_working_tree

### 背景与改动目标

新用户进入根路径时需要更明确的提问入口、公共问题示例与个人服务的登录引导；原有聊天页直接承载输入区，无法区分新会话欢迎态和已有会话内容。同时，侧栏文案与配色需要统一，代码复制在不支持 Clipboard API 的环境中也应可用。

本次新增欢迎页与登录提示 Modal，保留匿名公共问答能力，并将个人数据类推荐问题引导至统一身份认证。同步补齐主题 token 的 CSS 变量桥接、会话侧栏的展示细节和代码复制降级策略。

### 改动概览

- 新增 `WelcomePage`：根路径显示居中输入区、轮播推荐问题和登录标签；公共问题可直接提交，个人数据类问题在未登录时打开登录提示。
- 新增 `LoginReminderModal`：在未登录资料加载完成后每个标签页提示一次登录权益，并支持跳转同济统一身份认证。
- `App` 根据 session 路由在 `WelcomePage` 和 `ChatArea` 间切换；新增主题 CSS 变量注入组件，并在 `ConfigProvider` 子树中读取最终 token，确保自定义 CSS 与 Ant Design 主题一致。
- 侧栏将 New Chat、Recents 等文案本地化为中文；无会话时隐藏“最近”标题，调整间距、容器背景和用户图标主色。
- 代码块复制优先使用 Clipboard API；不可用或写入失败时回退到临时 textarea + `document.execCommand("copy")`。
- 修复匿名会话初始化触发的同步 Effect 更新；登出只清理登录提示标记，不再清空同源全部 `sessionStorage`。
- 补齐欢迎页区域的无障碍标题关联，并更新会话列表与测试环境配置的回归测试。

### 关键链路解析（含上下游）

- 上游依赖：`useSessionRoute.sessionId` 决定当前处于欢迎态还是已打开会话；`UserBasicInfoGET` 解析完成后提供登录状态和用户姓名；`useChat` 继续统一处理输入、建会话和 SSE 提交。
- 当前改动：根路径渲染 `WelcomePage`，公共推荐问题直接调用 `submitQuestion`；未登录点击“需登录”问题则打开 `LoginReminderModal`，确认后跳转 OAuth 授权地址。首个匿名状态在当前标签页仅自动显示一次提醒。
- 下游影响：用户提交问题后既有 `useChat` 创建 session、更新路由并切换至 `ChatArea` 的流程保持不变。主题变量通过 `ThemeCssVariables` 写入根节点，供既有 CSS 使用；侧栏、欢迎页和 Markdown 代码块共享同一套主题色。

### 改动结果与业务影响

根路径现在提供欢迎式提问体验，并能在个人服务请求前清晰引导登录；已有会话仍保持原聊天渲染与恢复链路。侧栏视觉和中文文案更一致，代码复制在受限浏览器环境中具备降级能力。主题 token 与自定义 CSS 的取值已统一，避免配置主色与页面样式不一致。

### 验证结果

- `pnpm test`：8 个测试文件、40 个用例全部通过。
- `pnpm test:typecheck`、`pnpm lint`、`pnpm build` 和 `git diff --check` 全部通过。
- Vite 构建仍提示主 JavaScript bundle 超过 500 kB；本次未调整拆包策略。

### 风险与待办

- 登录提示以 `sessionStorage` 记录当前标签页是否已经展示；关闭后本标签页不再自动弹出，但个人服务推荐项仍可主动触发提示。
- Clipboard 降级依赖已被逐步废弃的 `document.execCommand`，仅作为不支持现代 Clipboard API 时的兼容路径；后续应持续关注目标浏览器支持情况。
- 欢迎页推荐问题为静态内容，若后续接入运营配置或按用户画像推荐，需要补充数据来源、缓存和内容审核边界。

### 建议 Commit Message（git-cz）

- `feat(chat): add welcome page and login guidance`

## CHANGELOG - 2026-08-12 19:42 - 支持匿名会话本地保存与侧栏恢复

### 撰写时间

- 2026-08-12 19:42

### Base Commit

- 63202b770d645bd2a59f3e29d913d61fa3088c0a

### Compare Scope

- working_tree_only

### 背景与改动目标

认证用户的会话由服务端列表提供，但未登录用户创建的临时会话没有可恢复的本地索引。页面刷新或重新进入聊天页后，侧栏无法获知这些 session；同时，同一个匿名会话继续发送消息时，最近活跃顺序也需要跟随对话推进。

因此本次把匿名 session 的摘要信息落到浏览器 `localStorage`，并使侧栏在未取得用户资料时读取该本地来源。重点是保留既有认证用户的服务端会话路径，而不改变 CAM 客户端或 SSE 请求的调用契约。

### 改动概览

- 新增 `src/utils/anonymous-session.ts`，以 `anonymous-sessions` 为键保存、读取、清理和按 `lastActiveAt` 排序匿名会话摘要。
- `App.handleSessionCreated` 接收 `isAnonymous` 标记；匿名会话创建后同时写入本地存储、页面内 `createdSessions` 和会话路由。
- `useChat` 将 `CreatedSession` 收敛为 `SessionSummary`，创建会话时透传匿名标记；复用既有匿名 `session_id` 发送后会更新本地 `lastActiveAt`，避免排序停留在首次创建时间。
- `SessionSidebar` 未登录时读取本地匿名会话，并在非加载状态统一渲染合并后的会话列表，因此新建匿名会话和刷新后恢复的会话都能进入左侧 `Recents`。
- 新增匿名存储与 Hook 回归测试，覆盖本地排序、更新时间和复用匿名会话的第二轮发送。

### 关键链路解析（含上下游）

- 上游依赖：`ChatArea` 仍经 `useChat.submitQuestion` 创建或复用 session；`App` 通过 `UserBasicInfoGET` 的结果判定当前会话是否匿名。认证用户仍由 `SessionSidebar` 调用 `SessionGET` 获取服务端列表。
- 当前改动：首次匿名创建时，`useChat.getOrCreateSessionId` 调用 `onSessionCreated(session, true)`；`App` 使用 `addAnonymousSession` 持久化摘要，并将 session 写入 React state、跳转 `/session/:id`。后续发消息命中 `sessionIdRef` 时调用 `updateAnonymousSessionLastActiveAt`；侧栏在匿名分支读取相同存储键，再与当前 state 合并去重、按活跃时间排序。
- 下游影响：路由、SSE 消息提交和认证用户会话列表仍使用原 session id 与服务调用。侧栏现在不再因 `userBasicInfo` 为空而省略 `displayedSessions` 的渲染，匿名和认证两种数据源共用同一展示组件。

### 改动结果与业务影响

匿名会话已可在当前页面即时显示，并可在刷新后的未登录状态从本地恢复到侧栏；继续对话会刷新活跃时间，排序能反映最近使用的会话。`pnpm test` 已通过 8 个测试文件、36 个用例，`pnpm test:typecheck`、`pnpm build` 和 `git diff --check --cached` 通过。

### 风险与待办

- 匿名会话索引仅保存在当前浏览器的 `localStorage`。清除站点数据、使用无痕窗口或切换设备后无法恢复；这符合匿名会话的本地边界，但应在产品说明中明确。
- `anonymous-session.ts` 当前直接 `JSON.parse` 本地值。若用户手动篡改或旧版本遗留了非法 JSON，读取会抛错并影响侧栏渲染；后续应增加容错解析与结构校验。
- `pnpm lint` 当前仍未通过：`App.tsx` 的冗余 `Boolean` 调用，以及 `SessionSidebar` 在 effect 中同步设置本地会话 state，分别触发 `no-extra-boolean-cast` 和 `react-hooks/set-state-in-effect`。这些问题不影响本次测试与构建结论，但合并前仍需修复。
- Vite 继续提示主 JavaScript bundle 超过 500 kB；本次没有调整拆包策略。

### 建议 Commit Message（git-cz）

- `feat(chat): persist anonymous sessions locally`

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
