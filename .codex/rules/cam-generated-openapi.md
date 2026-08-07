# CAM 生成 OpenAPI 客户端规则

## 适用范围

本规则适用于 `cam.config.json`、`cam-fe-code-generator`、`pnpm cam update`，以及
`src/cam-auto-generate` 中的所有文件和子目录。

## 目录所有权

`src/cam-auto-generate` 是 CAM 唯一拥有的**只读生成目录**。该目录中的客户端、类型、
请求示例及其目录结构以最近一次 `pnpm cam update` 的结果为准，后续更新可以整体覆盖。

以下操作禁止直接作用于该目录：

- 手工修改、格式化、重命名或移动生成文件。
- 在生成文件中修复类型、补充注释或添加业务逻辑。
- 在 MCP Tool、领域服务或运行入口中直接依赖生成客户端的类名、方法名或原始响应字段。
- 将访问 token、用户身份、业务校验、脱敏或错误处理写入生成文件。

需要改变生成结果时，只能修改 `cam.config.json` 或 CAM 服务定义，再执行 `pnpm cam update`。

生成代码是仓库的可再生产物，应与对应的 `cam.config.json`、`package.json` 和
`pnpm-lock.yaml` 一起提交，确保其他开发者和 CI 可以得到相同的客户端版本。
