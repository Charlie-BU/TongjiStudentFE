# TongjiStudentFE 单元测试规范

本文为 `TongjiStudentFE` 的单元测试规范。仓库是同济同学 Agent 的 React + Vite 前端，负责认证后的用户交互、会话展示、流式事件呈现与后端 API 调用；不在前端测试中访问真实认证服务、同济平台或 Agent 服务。

本文不引入 CI。每次提交前由开发者在本地执行受影响测试与质量检查；将来接入 CI 时应复用本文命令，不能为了 CI 改写测试边界。

## 1. 目标与边界

- 用确定性、离线的测试守住输入、流式事件投影、会话状态和 UI 交互契约。
- 覆盖前端对 Agent API 的请求构造、SSE 解析、取消、错误和展示分流；Agent 的推理、工具调用和知识库结果属于后端职责，不在本仓 mock 后验证其内部实现。
- 测试失败应能定位到纯逻辑、组件交互、网络适配或页面集成层，不依赖真实 token、真实学生数据、浏览器登录态或外网。
- 单测不替代浏览器端到端测试或与 TongjiStudentAgent 的联调。此类场景另建明确标识的集成/E2E 测试，不能混入提交前单测。

适用范围是 `src/` 中的手写代码。`src/cam-auto-generate/` 是 CAM 管理的生成目录：不手改、不为生成代码补逐行单测；应测试其上层的手写 API 适配器、请求构造和错误映射。

## 2. 基线工具与执行方式

当前仓库尚未接入测试运行器。首次引入测试时，统一使用 **Vitest + jsdom + React Testing Library**，与 React 19、Vite 8 和 ESM 构建链路保持一致；不要为同一前端仓混用 Jest、Node 原生测试或多个断言库。

首次接入时增加以下开发依赖：

```bash
pnpm add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

并在 `package.json` 中增加：

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:typecheck": "tsc --noEmit -p tsconfig.test.json",
    "test:coverage": "vitest run --coverage",
    "check": "pnpm test && pnpm test:typecheck && pnpm lint && pnpm build"
  }
}
```

同时增加 `vitest.config.ts`，复用 Vite 的 React 插件，并配置：

```ts
test: {
  environment: 'jsdom',
  include: ['test/**/*.{test,spec}.{ts,tsx}'],
  setupFiles: ['./test/setup.ts'],
}
```

`test/setup.ts` 统一导入 `@testing-library/jest-dom/vitest`。如需独立类型检查，新增 `tsconfig.test.json`，继承 `tsconfig.app.json` 并只扩展测试目录和 Vitest 类型；不得把测试文件编译进生产产物。

约定命令如下：

```bash
# 跑全部单测（接入测试后，提交前必跑）
pnpm test

# 持续运行受影响测试
pnpm test:watch

# 跑单个文件或名称匹配的场景
pnpm exec vitest run test/components/chat-input.test.tsx
pnpm exec vitest run --testNamePattern='Enter 发送' test/components/chat-input.test.tsx

# 提交前质量检查
pnpm test:typecheck
pnpm lint
pnpm build
```

当前未设置覆盖率阈值。优先保证关键边界有高价值断言；覆盖率脚本只能辅助发现遗漏，不能替代行为、失败路径和隐私边界测试。

## 3. 目录、命名与测试结构

测试与源码分离，统一放在仓库根目录的 `test/`。测试目录按被测职责镜像组织：

```text
TongjiStudentFE/
├── src/
│   ├── components/
│   ├── services/                 # 后续手写 API/SSE 适配器
│   └── cam-auto-generate/        # CAM 生成代码，不在此直接测试
└── test/
    ├── components/chat-input.test.tsx
    ├── components/chat-area.test.tsx
    ├── services/agent-stream.test.ts
    ├── utils/<module>.test.ts
    ├── fixtures/
    ├── helpers/
    └── setup.ts
```

- 文件名使用 `<被测模块名>.test.ts` 或 `<被测组件名>.test.tsx`；`.spec.ts` / `.spec.tsx` 可接受，但同一目录保持一致。
- `describe` 使用被测单元名称；`it`/`test` 描述可观察行为，使用“应……”或 `should ...`，同一文件保持一致。
- 单文件聚焦一个被测模块或组件。跨组件、流式 API 和页面状态的场景单独建文件，并在 `describe` 中标明“集成场景”。
- `test/fixtures/` 只放稳定、脱敏、可复用的请求、SSE 事件和响应样例；`test/helpers/` 只放渲染器、Fake、时间控制和工厂函数。不得把业务逻辑移动到 helper 以逃避测试。

## 4. Mock 与隔离原则

测试隔离外部和不稳定边界，不 mock 被测单元自身的业务实现。

| 依赖或边界 | 单测做法 |
| --- | --- |
| Agent HTTP/SSE API | 在手写 service 边界注入 `fetch`/流读取器 Fake，验证请求、事件顺序、取消和错误映射；绝不访问真实服务。 |
| authorize、token 和浏览器存储 | 使用虚构 token 与内存 Fake；每个用例独立初始化并清理，不读写真实 Cookie、localStorage 登录态或环境凭证。 |
| CAM 生成客户端 | 在上层手写适配器替换为 Fake，不深度 mock 或修改 `src/cam-auto-generate/`。 |
| 时间、定时器、随机数 | 使用 Vitest fake timer 或显式注入；用例不得依赖当前日期、等待真实网络或执行顺序。 |
| `scrollIntoView`、`ResizeObserver` 等浏览器 API | 在 `test/setup.ts` 提供最小的 jsdom stub，只断言可观察的 UI 行为。 |

禁止：

- 在测试、fixture、快照或终端输出中使用真实 Access Token、Cookie、学号、姓名、课表、成绩、消费记录、生产 URL 或真实 SSE 内容。
- 通过 mock 私有函数、断言内部调用次数来替代对用户可见输出、请求参数和副作用的验证。
- 发起真实网络请求，或把依赖超时的 `setTimeout` 当作流式测试手段。
- 对完整页面或后端原始响应做大快照断言；优先断言关键 DOM、最小数据对象和允许字段。

## 5. 分层覆盖要求

每次新增或修改手写逻辑，都应在其职责层补齐适用场景。

### 5.1 纯逻辑与事件映射

例如 Mock/SSE 事件生成、事件投影、消息状态转换、输入清理和错误分类。至少覆盖正常输入、空值/边界值、事件顺序、取消和异常事件。纯逻辑优先直接调用，不渲染 React 组件。

`mock-stream.ts` 一类异步生成器应使用受控 timer 或 Fake stream，断言事件类型、顺序与中止后的行为；不能以固定等待时长断言“最终大概完成”。

### 5.2 输入组件：`src/components/chat-input/`

`ChatInput` 至少覆盖：

- 空输入时发送按钮禁用，非空输入时启用；
- 点击发送与 Enter 调用提交，Shift+Enter 保留换行；中文输入法组合阶段不得误提交；
- 流式状态显示停止按钮，点击后只调用 `onStop`；
- 提及、附件等尚未实现能力只验证其可访问名称和无副作用，不为预留空回调制造业务断言；
- 禁用状态下不可编辑，图标按钮和发送/停止按钮具备可访问名称。

### 5.3 对话区域：`src/components/chat-area/`

`ChatArea` 至少覆盖：

- 首屏文本输入状态；输入问题并发送后创建用户消息；
- Agent 中间活动与最终 assistant message 分开展示，流式增量只追加到最终回答；
- 停止生成将当前轮标记为停止，后续事件不得继续写入该轮；
- 多轮会话状态互不串扰；空回答、异常与取消展示稳定、可理解的结果。

不要对 antd 内部 class、动画实现或 `scrollIntoView` 调用次数作断言；测试用户可见文案、角色、可访问属性和消息内容。

### 5.4 API、认证与 SSE 适配：后续 `src/services/`

首次接入后端 API 时，至少覆盖 authorize 跳转/回调参数、跳过登录、token 缺失/过期、鉴权请求头构造、SSE 分帧、未知事件、网络中断、AbortSignal 和用户可读错误。Access Token 只能由存储/认证边界提供，不能从聊天输入、URL 或消息内容推断。

## 6. 测试数据与断言

- Fixture 使用虚构值，例如 `test-access-token`、`student_001`、`test-session-001`；不得使用任何可识别真实个人的信息。
- 每个用例创建自己的可变输入；不要复用后再修改同一个对象。
- 对组件优先使用 Testing Library 的 `getByRole`、`getByLabelText`、`findByText` 与 `userEvent`，以用户行为而非实现细节定位元素。
- 对复杂对象使用最小 `toEqual` 期望；对安全相关输出添加反向断言，确认序列化文本不包含 token 或敏感字段。
- 错误断言关注公开错误类别或可见文案，不依赖浏览器、Fetch 或 antd 的完整内部错误文本。

## 7. 提交前本地闭环

当前尚未接入测试运行器时，新增带逻辑的模块或组件应优先完成第 2 节定义的测试基线与对应测试，不能以“仓库还没有测试”跳过。

接入测试后，每次提交前执行：

1. 确认改动属于纯逻辑、组件、会话状态、API/SSE 或认证边界，并列出正常、边界和失败场景。
2. 先运行最小受影响测试文件；失败时最小化修正实现或错误预期并重跑。
3. 运行 `pnpm test`，确保所有单测可重复通过。
4. 运行 `pnpm test:typecheck`、`pnpm lint` 和 `pnpm build`；也可执行 `pnpm check`。
5. 检查 fixture、快照、Mock、终端输出和提交内容不包含 token、Cookie、真实学生数据或生产地址。

纯文档、纯样式且不影响交互逻辑的改动，可说明无需新增单测，但仍应执行受影响的构建和 lint。

## 8. 评审检查清单

- [ ] 新增或变更的手写逻辑有对应 `.test.ts` / `.test.tsx`，且测试位于 `test/`。
- [ ] 正常、空值/边界、取消和失败路径均按职责层覆盖。
- [ ] HTTP/SSE、认证、存储、时间和浏览器 API 已隔离；没有真实网络请求。
- [ ] Agent 中间工作内容与 assistant 最终消息的展示断言彼此独立。
- [ ] Access Token 与校园个人数据不出现在 fixture、快照、错误、日志或断言中。
- [ ] CAM 生成代码没有被手改、深度 mock 或直接作为测试对象。
- [ ] 已执行受影响测试、`pnpm test`、`pnpm test:typecheck`、`pnpm lint` 和 `pnpm build`；尚未接入测试基线时，已在提交说明中记录原因和落地计划。

## 9. 演进原则

当后续需要真实浏览器、多标签认证流程、跨服务联调或视觉回归时，应单独建设 E2E 测试，不应放宽本文的离线、确定性单测约束。只有当 Vitest、Testing Library 或可注入 Fake 已无法清晰表达需要验证的场景时，才评估引入新的测试工具；引入前须说明解决的具体问题，并保持本文的目录、边界、隐私和本地闭环要求不变。
