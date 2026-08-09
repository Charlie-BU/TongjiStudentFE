# Ant Design 主题颜色规则

## 适用范围

本规则适用于 `src` 中的 TypeScript、TSX 与 CSS 文件，以及所有新增或修改的 Ant Design 主题配置。

## 颜色使用约束

- CSS 中必须使用 Ant Design 输出的 CSS 变量表达颜色和阴影，例如 `var(--ant-color-bg-layout)`、`var(--ant-color-text)`、`var(--ant-color-border-secondary)` 与 `var(--ant-box-shadow-tertiary)`。
- 禁止在 CSS 中新增或保留十六进制、`rgb()`、`rgba()`、`hsl()`、`hsla()` 等硬编码颜色值。
- `transparent` 可用于明确表示透明状态，例如输入框无焦点边框的场景。
- 新增颜色前应优先选择语义匹配的全局 token；只有全局 token 无法表达时，才查询并使用对应组件 token。

## 主题配置约束

- 项目根部 `ConfigProvider` 必须开启 `theme.cssVar: {}`，保证 CSS 中的 `--ant-*` 变量可用。
- 品牌主色、指定页面背景等设计种子值只能定义在 `ConfigProvider.theme.token` 中，例如 `colorPrimary`、`colorBgLayout`；不得复制到业务 CSS。
- 修改主题色时，应通过 `theme.token` 或 `theme.components` 覆盖 token，不得以选择器覆盖散落的固定色值。

## 常用映射

- 页面、容器与浮层背景：`colorBgLayout`、`colorBgContainer`、`colorBgElevated`。
- 主、次、占位与禁用文字：`colorText`、`colorTextSecondary`、`colorTextPlaceholder`、`colorTextDisabled`。
- 边框与分割线：`colorBorder`、`colorBorderSecondary`、`colorSplit`。
- Hover、Active 与禁用填充：`colorFillSecondary`、`colorFill`、`colorBgContainerDisabled`。
- 品牌和状态：`colorPrimary`、`colorSuccess`、`colorWarning`、`colorError`、`colorInfo`。
- 阴影：`boxShadowTertiary`、`boxShadow`、`boxShadowSecondary`。

## 验证

完成样式改动后，应运行以下检查：

```bash
rg -n --glob '*.{ts,tsx,css}' '(#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\()' src
pnpm exec antd lint ./src --format json
```

第一条命令只允许命中 `ConfigProvider.theme.token` 中经确认的设计种子值；其余命中必须消除。
