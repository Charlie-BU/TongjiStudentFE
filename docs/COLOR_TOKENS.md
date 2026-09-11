# 颜色 Token 参考

基于本项目当前 Ant Design 6.6.2、默认亮色算法和 [App.tsx](../src/App.tsx) 的主题配置计算。

## 范围与使用方式

- 列出当前全局主题解析出的全部 **405 个单色 token**，包含语义色、交互色、预设色板及兼容别名；附项目显式配置的 Input 颜色。组件内部另行派生的私有颜色、阴影字符串、第三方语法高亮配色不属于本表。
- 主色覆盖为 `#1D6CFF`，布局背景覆盖为 `#FCFCFC`。其余颜色由当前安装的 Ant Design 算法计算，不能据此假定所有蓝色都等于项目主色，例如 `colorInfo` 和 `colorLink` 仍为 `#1677FF`。
- CSS 写法：`color: var(--ant-color-text);`。JS 写法：`const { token } = theme.useToken();`，然后使用 `token.colorText`。
- 表中“根节点”表示项目的 `ThemeCssVariables` 已将变量写到 `document.documentElement`；其他变量依赖 Ant Design 的 `.tongji-student-theme` 作用域，使用时确保元素或其祖先带有该主题作用域。
- 十六进制格式为 `#RRGGBB` 或 `#RRGGBBAA`，末两位为透明度。例如 `rgba(0,0,0,0.88)` 对应 `#000000E0`，不是不透明黑色。Alpha 转为 8 位时会四舍五入，精确透明度以原始值为准；实际显示色取决于下层背景。
- `transparent` 写为 `#00000000`。主题或依赖版本变化后应重新生成色值，业务 CSS 优先引用 token，不硬编码本表数值。

## 文本与图标

| Token | CSS 变量 | 十六进制 | 原始值 | 根节点 |
| --- | --- | --- | --- | --- |
| `colorTextBase` | `--ant-color-text-base` | `#000000` | `#000` | 否 |
| `colorText` | `--ant-color-text` | `#000000E0` | `rgba(0,0,0,0.88)` | 是 |
| `colorTextSecondary` | `--ant-color-text-secondary` | `#000000A6` | `rgba(0,0,0,0.65)` | 是 |
| `colorTextTertiary` | `--ant-color-text-tertiary` | `#00000073` | `rgba(0,0,0,0.45)` | 是 |
| `colorTextQuaternary` | `--ant-color-text-quaternary` | `#00000040` | `rgba(0,0,0,0.25)` | 否 |
| `colorTextPlaceholder` | `--ant-color-text-placeholder` | `#00000040` | `rgba(0,0,0,0.25)` | 是 |
| `colorTextDisabled` | `--ant-color-text-disabled` | `#00000040` | `rgba(0,0,0,0.25)` | 是 |
| `colorTextHeading` | `--ant-color-text-heading` | `#000000E0` | `rgba(0,0,0,0.88)` | 否 |
| `colorTextLabel` | `--ant-color-text-label` | `#000000A6` | `rgba(0,0,0,0.65)` | 否 |
| `colorTextDescription` | `--ant-color-text-description` | `#00000073` | `rgba(0,0,0,0.45)` | 否 |
| `colorTextLightSolid` | `--ant-color-text-light-solid` | `#FFFFFF` | `#fff` | 是 |
| `colorIcon` | `--ant-color-icon` | `#00000073` | `rgba(0,0,0,0.45)` | 否 |
| `colorIconHover` | `--ant-color-icon-hover` | `#000000E0` | `rgba(0,0,0,0.88)` | 否 |

## 背景、填充与边框

| Token | CSS 变量 | 十六进制 | 原始值 | 根节点 |
| --- | --- | --- | --- | --- |
| `colorBgBase` | `--ant-color-bg-base` | `#FFFFFF` | `#fff` | 否 |
| `colorBgLayout` | `--ant-color-bg-layout` | `#FCFCFC` | `#fcfcfc` | 是 |
| `colorShadow` | `--ant-color-shadow` | `#000000` | `#000` | 否 |
| `colorFill` | `--ant-color-fill` | `#00000026` | `rgba(0,0,0,0.15)` | 是 |
| `colorFillSecondary` | `--ant-color-fill-secondary` | `#0000000F` | `rgba(0,0,0,0.06)` | 是 |
| `colorFillTertiary` | `--ant-color-fill-tertiary` | `#0000000A` | `rgba(0,0,0,0.04)` | 是 |
| `colorFillQuaternary` | `--ant-color-fill-quaternary` | `#00000005` | `rgba(0,0,0,0.02)` | 是 |
| `colorBgSolid` | `--ant-color-bg-solid` | `#000000` | `rgb(0,0,0)` | 否 |
| `colorBgSolidHover` | `--ant-color-bg-solid-hover` | `#000000BF` | `rgba(0,0,0,0.75)` | 否 |
| `colorBgSolidActive` | `--ant-color-bg-solid-active` | `#000000F2` | `rgba(0,0,0,0.95)` | 否 |
| `colorBgContainer` | `--ant-color-bg-container` | `#FFFFFF` | `#ffffff` | 是 |
| `colorBgElevated` | `--ant-color-bg-elevated` | `#FFFFFF` | `#ffffff` | 否 |
| `colorBgSpotlight` | `--ant-color-bg-spotlight` | `#000000D9` | `rgba(0,0,0,0.85)` | 否 |
| `colorBgBlur` | `--ant-color-bg-blur` | `#00000000` | `transparent` | 否 |
| `colorBorder` | `--ant-color-border` | `#D9D9D9` | `#d9d9d9` | 是 |
| `colorBorderDisabled` | `--ant-color-border-disabled` | `#D9D9D9` | `#d9d9d9` | 否 |
| `colorBorderSecondary` | `--ant-color-border-secondary` | `#F0F0F0` | `#f0f0f0` | 是 |
| `colorBgMask` | `--ant-color-bg-mask` | `#00000073` | `rgba(0,0,0,0.45)` | 否 |
| `colorWhite` | `--ant-color-white` | `#FFFFFF` | `#fff` | 否 |
| `colorFillContent` | `--ant-color-fill-content` | `#0000000F` | `rgba(0,0,0,0.06)` | 否 |
| `colorFillContentHover` | `--ant-color-fill-content-hover` | `#00000026` | `rgba(0,0,0,0.15)` | 否 |
| `colorFillAlter` | `--ant-color-fill-alter` | `#00000005` | `rgba(0,0,0,0.02)` | 否 |
| `colorBgContainerDisabled` | `--ant-color-bg-container-disabled` | `#0000000A` | `rgba(0,0,0,0.04)` | 是 |
| `colorBorderBg` | `--ant-color-border-bg` | `#FFFFFF` | `#ffffff` | 否 |
| `colorSplit` | `--ant-color-split` | `#0505050F` | `rgba(5,5,5,0.06)` | 否 |
| `colorBgTextHover` | `--ant-color-bg-text-hover` | `#0000000F` | `rgba(0,0,0,0.06)` | 否 |
| `colorBgTextActive` | `--ant-color-bg-text-active` | `#00000026` | `rgba(0,0,0,0.15)` | 否 |

## 主色

| Token | CSS 变量 | 十六进制 | 原始值 | 根节点 |
| --- | --- | --- | --- | --- |
| `colorPrimary` | `--ant-color-primary` | `#1D6CFF` | `#1d6cff` | 是 |
| `colorPrimaryBg` | `--ant-color-primary-bg` | `#E8F4FF` | `#e8f4ff` | 否 |
| `colorPrimaryBgHover` | `--ant-color-primary-bg-hover` | `#BFDEFF` | `#bfdeff` | 否 |
| `colorPrimaryBorder` | `--ant-color-primary-border` | `#96C5FF` | `#96c5ff` | 否 |
| `colorPrimaryBorderHover` | `--ant-color-primary-border-hover` | `#6EAAFF` | `#6eaaff` | 否 |
| `colorPrimaryHover` | `--ant-color-primary-hover` | `#458CFF` | `#458cff` | 否 |
| `colorPrimaryActive` | `--ant-color-primary-active` | `#0D4ED9` | `#0d4ed9` | 否 |
| `colorPrimaryTextHover` | `--ant-color-primary-text-hover` | `#458CFF` | `#458cff` | 否 |
| `colorPrimaryText` | `--ant-color-primary-text` | `#1D6CFF` | `#1d6cff` | 否 |
| `colorPrimaryTextActive` | `--ant-color-primary-text-active` | `#0D4ED9` | `#0d4ed9` | 否 |

## 成功色

| Token | CSS 变量 | 十六进制 | 原始值 | 根节点 |
| --- | --- | --- | --- | --- |
| `colorSuccess` | `--ant-color-success` | `#52C41A` | `#52c41a` | 否 |
| `colorSuccessBg` | `--ant-color-success-bg` | `#F6FFED` | `#f6ffed` | 否 |
| `colorSuccessBgHover` | `--ant-color-success-bg-hover` | `#D9F7BE` | `#d9f7be` | 否 |
| `colorSuccessBorder` | `--ant-color-success-border` | `#B7EB8F` | `#b7eb8f` | 否 |
| `colorSuccessBorderHover` | `--ant-color-success-border-hover` | `#95DE64` | `#95de64` | 否 |
| `colorSuccessHover` | `--ant-color-success-hover` | `#95DE64` | `#95de64` | 否 |
| `colorSuccessActive` | `--ant-color-success-active` | `#389E0D` | `#389e0d` | 否 |
| `colorSuccessTextHover` | `--ant-color-success-text-hover` | `#73D13D` | `#73d13d` | 否 |
| `colorSuccessText` | `--ant-color-success-text` | `#52C41A` | `#52c41a` | 否 |
| `colorSuccessTextActive` | `--ant-color-success-text-active` | `#389E0D` | `#389e0d` | 否 |

## 警告色

| Token | CSS 变量 | 十六进制 | 原始值 | 根节点 |
| --- | --- | --- | --- | --- |
| `colorWarning` | `--ant-color-warning` | `#FAAD14` | `#faad14` | 否 |
| `colorWarningBg` | `--ant-color-warning-bg` | `#FFFBE6` | `#fffbe6` | 否 |
| `colorWarningBgHover` | `--ant-color-warning-bg-hover` | `#FFF1B8` | `#fff1b8` | 否 |
| `colorWarningBorder` | `--ant-color-warning-border` | `#FFE58F` | `#ffe58f` | 否 |
| `colorWarningBorderHover` | `--ant-color-warning-border-hover` | `#FFD666` | `#ffd666` | 否 |
| `colorWarningHover` | `--ant-color-warning-hover` | `#FFD666` | `#ffd666` | 否 |
| `colorWarningActive` | `--ant-color-warning-active` | `#D48806` | `#d48806` | 否 |
| `colorWarningTextHover` | `--ant-color-warning-text-hover` | `#FFC53D` | `#ffc53d` | 否 |
| `colorWarningText` | `--ant-color-warning-text` | `#FAAD14` | `#faad14` | 否 |
| `colorWarningTextActive` | `--ant-color-warning-text-active` | `#D48806` | `#d48806` | 否 |
| `colorWarningOutline` | `--ant-color-warning-outline` | `#FFD7051A` | `rgba(255,215,5,0.1)` | 否 |
| `colorWarningAffix` | `--ant-color-warning-affix` | `#FAAD14` | `#faad14` | 否 |

## 错误与高亮

| Token | CSS 变量 | 十六进制 | 原始值 | 根节点 |
| --- | --- | --- | --- | --- |
| `colorError` | `--ant-color-error` | `#FF4D4F` | `#ff4d4f` | 否 |
| `colorErrorBg` | `--ant-color-error-bg` | `#FFF2F0` | `#fff2f0` | 否 |
| `colorErrorBgHover` | `--ant-color-error-bg-hover` | `#FFF1F0` | `#fff1f0` | 否 |
| `colorErrorBgFilledHover` | `--ant-color-error-bg-filled-hover` | `#FFDFDC` | `#ffdfdc` | 否 |
| `colorErrorBgActive` | `--ant-color-error-bg-active` | `#FFCCC7` | `#ffccc7` | 否 |
| `colorErrorBorder` | `--ant-color-error-border` | `#FFCCC7` | `#ffccc7` | 否 |
| `colorErrorBorderHover` | `--ant-color-error-border-hover` | `#FFA39E` | `#ffa39e` | 否 |
| `colorErrorHover` | `--ant-color-error-hover` | `#FF7875` | `#ff7875` | 否 |
| `colorErrorActive` | `--ant-color-error-active` | `#D9363E` | `#d9363e` | 否 |
| `colorErrorTextHover` | `--ant-color-error-text-hover` | `#FF7875` | `#ff7875` | 否 |
| `colorErrorText` | `--ant-color-error-text` | `#FF4D4F` | `#ff4d4f` | 否 |
| `colorErrorTextActive` | `--ant-color-error-text-active` | `#D9363E` | `#d9363e` | 否 |
| `colorHighlight` | `--ant-color-highlight` | `#FF4D4F` | `#ff4d4f` | 否 |
| `colorErrorOutline` | `--ant-color-error-outline` | `#FF26050F` | `rgba(255,38,5,0.06)` | 否 |
| `colorErrorAffix` | `--ant-color-error-affix` | `#FF4D4F` | `#ff4d4f` | 否 |

## 信息与链接

| Token | CSS 变量 | 十六进制 | 原始值 | 根节点 |
| --- | --- | --- | --- | --- |
| `colorInfo` | `--ant-color-info` | `#1677FF` | `#1677ff` | 否 |
| `colorLink` | `--ant-color-link` | `#1677FF` | `#1677ff` | 否 |
| `colorInfoBg` | `--ant-color-info-bg` | `#E6F4FF` | `#e6f4ff` | 否 |
| `colorInfoBgHover` | `--ant-color-info-bg-hover` | `#BAE0FF` | `#bae0ff` | 否 |
| `colorInfoBorder` | `--ant-color-info-border` | `#91CAFF` | `#91caff` | 否 |
| `colorInfoBorderHover` | `--ant-color-info-border-hover` | `#69B1FF` | `#69b1ff` | 否 |
| `colorInfoHover` | `--ant-color-info-hover` | `#69B1FF` | `#69b1ff` | 否 |
| `colorInfoActive` | `--ant-color-info-active` | `#0958D9` | `#0958d9` | 否 |
| `colorInfoTextHover` | `--ant-color-info-text-hover` | `#4096FF` | `#4096ff` | 否 |
| `colorInfoText` | `--ant-color-info-text` | `#1677FF` | `#1677ff` | 否 |
| `colorInfoTextActive` | `--ant-color-info-text-active` | `#0958D9` | `#0958d9` | 否 |
| `colorLinkHover` | `--ant-color-link-hover` | `#69B1FF` | `#69b1ff` | 否 |
| `colorLinkActive` | `--ant-color-link-active` | `#0958D9` | `#0958d9` | 否 |

## 控件交互色

| Token | CSS 变量 | 十六进制 | 原始值 | 根节点 |
| --- | --- | --- | --- | --- |
| `controlItemBgHover` | `--ant-control-item-bg-hover` | `#0000000A` | `rgba(0,0,0,0.04)` | 否 |
| `controlItemBgActive` | `--ant-control-item-bg-active` | `#E8F4FF` | `#e8f4ff` | 否 |
| `controlItemBgActiveHover` | `--ant-control-item-bg-active-hover` | `#BFDEFF` | `#bfdeff` | 否 |
| `controlItemBgActiveDisabled` | `--ant-control-item-bg-active-disabled` | `#00000026` | `rgba(0,0,0,0.15)` | 否 |
| `controlTmpOutline` | `--ant-control-tmp-outline` | `#00000005` | `rgba(0,0,0,0.02)` | 否 |
| `controlOutline` | `--ant-control-outline` | `#1991FF1A` | `rgba(25,145,255,0.1)` | 否 |

## 预设色板（含别名）

| Token | CSS 变量 | 十六进制 | 原始值 | 根节点 |
| --- | --- | --- | --- | --- |
| `blue` | `--ant-blue` | `#1677FF` | `#1677FF` | 否 |
| `purple` | `--ant-purple` | `#722ED1` | `#722ED1` | 否 |
| `cyan` | `--ant-cyan` | `#13C2C2` | `#13C2C2` | 否 |
| `green` | `--ant-green` | `#52C41A` | `#52C41A` | 否 |
| `magenta` | `--ant-magenta` | `#EB2F96` | `#EB2F96` | 否 |
| `pink` | `--ant-pink` | `#EB2F96` | `#EB2F96` | 否 |
| `red` | `--ant-red` | `#F5222D` | `#F5222D` | 否 |
| `orange` | `--ant-orange` | `#FA8C16` | `#FA8C16` | 否 |
| `yellow` | `--ant-yellow` | `#FADB14` | `#FADB14` | 否 |
| `volcano` | `--ant-volcano` | `#FA541C` | `#FA541C` | 否 |
| `geekblue` | `--ant-geekblue` | `#2F54EB` | `#2F54EB` | 否 |
| `gold` | `--ant-gold` | `#FAAD14` | `#FAAD14` | 否 |
| `lime` | `--ant-lime` | `#A0D911` | `#A0D911` | 否 |
| `blue-1` | `--ant-blue-1` | `#E6F4FF` | `#e6f4ff` | 否 |
| `blue1` | `--ant-blue-1` | `#E6F4FF` | `#e6f4ff` | 否 |
| `blue-2` | `--ant-blue-2` | `#BAE0FF` | `#bae0ff` | 否 |
| `blue2` | `--ant-blue-2` | `#BAE0FF` | `#bae0ff` | 否 |
| `blue-3` | `--ant-blue-3` | `#91CAFF` | `#91caff` | 否 |
| `blue3` | `--ant-blue-3` | `#91CAFF` | `#91caff` | 否 |
| `blue-4` | `--ant-blue-4` | `#69B1FF` | `#69b1ff` | 否 |
| `blue4` | `--ant-blue-4` | `#69B1FF` | `#69b1ff` | 否 |
| `blue-5` | `--ant-blue-5` | `#4096FF` | `#4096ff` | 否 |
| `blue5` | `--ant-blue-5` | `#4096FF` | `#4096ff` | 否 |
| `blue-6` | `--ant-blue-6` | `#1677FF` | `#1677ff` | 否 |
| `blue6` | `--ant-blue-6` | `#1677FF` | `#1677ff` | 否 |
| `blue-7` | `--ant-blue-7` | `#0958D9` | `#0958d9` | 否 |
| `blue7` | `--ant-blue-7` | `#0958D9` | `#0958d9` | 否 |
| `blue-8` | `--ant-blue-8` | `#003EB3` | `#003eb3` | 否 |
| `blue8` | `--ant-blue-8` | `#003EB3` | `#003eb3` | 否 |
| `blue-9` | `--ant-blue-9` | `#002C8C` | `#002c8c` | 否 |
| `blue9` | `--ant-blue-9` | `#002C8C` | `#002c8c` | 否 |
| `blue-10` | `--ant-blue-10` | `#001D66` | `#001d66` | 否 |
| `blue10` | `--ant-blue-10` | `#001D66` | `#001d66` | 否 |
| `purple-1` | `--ant-purple-1` | `#F9F0FF` | `#f9f0ff` | 否 |
| `purple1` | `--ant-purple-1` | `#F9F0FF` | `#f9f0ff` | 否 |
| `purple-2` | `--ant-purple-2` | `#EFDBFF` | `#efdbff` | 否 |
| `purple2` | `--ant-purple-2` | `#EFDBFF` | `#efdbff` | 否 |
| `purple-3` | `--ant-purple-3` | `#D3ADF7` | `#d3adf7` | 否 |
| `purple3` | `--ant-purple-3` | `#D3ADF7` | `#d3adf7` | 否 |
| `purple-4` | `--ant-purple-4` | `#B37FEB` | `#b37feb` | 否 |
| `purple4` | `--ant-purple-4` | `#B37FEB` | `#b37feb` | 否 |
| `purple-5` | `--ant-purple-5` | `#9254DE` | `#9254de` | 否 |
| `purple5` | `--ant-purple-5` | `#9254DE` | `#9254de` | 否 |
| `purple-6` | `--ant-purple-6` | `#722ED1` | `#722ed1` | 否 |
| `purple6` | `--ant-purple-6` | `#722ED1` | `#722ed1` | 否 |
| `purple-7` | `--ant-purple-7` | `#531DAB` | `#531dab` | 否 |
| `purple7` | `--ant-purple-7` | `#531DAB` | `#531dab` | 否 |
| `purple-8` | `--ant-purple-8` | `#391085` | `#391085` | 否 |
| `purple8` | `--ant-purple-8` | `#391085` | `#391085` | 否 |
| `purple-9` | `--ant-purple-9` | `#22075E` | `#22075e` | 否 |
| `purple9` | `--ant-purple-9` | `#22075E` | `#22075e` | 否 |
| `purple-10` | `--ant-purple-10` | `#120338` | `#120338` | 否 |
| `purple10` | `--ant-purple-10` | `#120338` | `#120338` | 否 |
| `cyan-1` | `--ant-cyan-1` | `#E6FFFB` | `#e6fffb` | 否 |
| `cyan1` | `--ant-cyan-1` | `#E6FFFB` | `#e6fffb` | 否 |
| `cyan-2` | `--ant-cyan-2` | `#B5F5EC` | `#b5f5ec` | 否 |
| `cyan2` | `--ant-cyan-2` | `#B5F5EC` | `#b5f5ec` | 否 |
| `cyan-3` | `--ant-cyan-3` | `#87E8DE` | `#87e8de` | 否 |
| `cyan3` | `--ant-cyan-3` | `#87E8DE` | `#87e8de` | 否 |
| `cyan-4` | `--ant-cyan-4` | `#5CDBD3` | `#5cdbd3` | 否 |
| `cyan4` | `--ant-cyan-4` | `#5CDBD3` | `#5cdbd3` | 否 |
| `cyan-5` | `--ant-cyan-5` | `#36CFC9` | `#36cfc9` | 否 |
| `cyan5` | `--ant-cyan-5` | `#36CFC9` | `#36cfc9` | 否 |
| `cyan-6` | `--ant-cyan-6` | `#13C2C2` | `#13c2c2` | 否 |
| `cyan6` | `--ant-cyan-6` | `#13C2C2` | `#13c2c2` | 否 |
| `cyan-7` | `--ant-cyan-7` | `#08979C` | `#08979c` | 否 |
| `cyan7` | `--ant-cyan-7` | `#08979C` | `#08979c` | 否 |
| `cyan-8` | `--ant-cyan-8` | `#006D75` | `#006d75` | 否 |
| `cyan8` | `--ant-cyan-8` | `#006D75` | `#006d75` | 否 |
| `cyan-9` | `--ant-cyan-9` | `#00474F` | `#00474f` | 否 |
| `cyan9` | `--ant-cyan-9` | `#00474F` | `#00474f` | 否 |
| `cyan-10` | `--ant-cyan-10` | `#002329` | `#002329` | 否 |
| `cyan10` | `--ant-cyan-10` | `#002329` | `#002329` | 否 |
| `green-1` | `--ant-green-1` | `#F6FFED` | `#f6ffed` | 否 |
| `green1` | `--ant-green-1` | `#F6FFED` | `#f6ffed` | 否 |
| `green-2` | `--ant-green-2` | `#D9F7BE` | `#d9f7be` | 否 |
| `green2` | `--ant-green-2` | `#D9F7BE` | `#d9f7be` | 否 |
| `green-3` | `--ant-green-3` | `#B7EB8F` | `#b7eb8f` | 否 |
| `green3` | `--ant-green-3` | `#B7EB8F` | `#b7eb8f` | 否 |
| `green-4` | `--ant-green-4` | `#95DE64` | `#95de64` | 否 |
| `green4` | `--ant-green-4` | `#95DE64` | `#95de64` | 否 |
| `green-5` | `--ant-green-5` | `#73D13D` | `#73d13d` | 否 |
| `green5` | `--ant-green-5` | `#73D13D` | `#73d13d` | 否 |
| `green-6` | `--ant-green-6` | `#52C41A` | `#52c41a` | 否 |
| `green6` | `--ant-green-6` | `#52C41A` | `#52c41a` | 否 |
| `green-7` | `--ant-green-7` | `#389E0D` | `#389e0d` | 否 |
| `green7` | `--ant-green-7` | `#389E0D` | `#389e0d` | 否 |
| `green-8` | `--ant-green-8` | `#237804` | `#237804` | 否 |
| `green8` | `--ant-green-8` | `#237804` | `#237804` | 否 |
| `green-9` | `--ant-green-9` | `#135200` | `#135200` | 否 |
| `green9` | `--ant-green-9` | `#135200` | `#135200` | 否 |
| `green-10` | `--ant-green-10` | `#092B00` | `#092b00` | 否 |
| `green10` | `--ant-green-10` | `#092B00` | `#092b00` | 否 |
| `magenta-1` | `--ant-magenta-1` | `#FFF0F6` | `#fff0f6` | 否 |
| `magenta1` | `--ant-magenta-1` | `#FFF0F6` | `#fff0f6` | 否 |
| `magenta-2` | `--ant-magenta-2` | `#FFD6E7` | `#ffd6e7` | 否 |
| `magenta2` | `--ant-magenta-2` | `#FFD6E7` | `#ffd6e7` | 否 |
| `magenta-3` | `--ant-magenta-3` | `#FFADD2` | `#ffadd2` | 否 |
| `magenta3` | `--ant-magenta-3` | `#FFADD2` | `#ffadd2` | 否 |
| `magenta-4` | `--ant-magenta-4` | `#FF85C0` | `#ff85c0` | 否 |
| `magenta4` | `--ant-magenta-4` | `#FF85C0` | `#ff85c0` | 否 |
| `magenta-5` | `--ant-magenta-5` | `#F759AB` | `#f759ab` | 否 |
| `magenta5` | `--ant-magenta-5` | `#F759AB` | `#f759ab` | 否 |
| `magenta-6` | `--ant-magenta-6` | `#EB2F96` | `#eb2f96` | 否 |
| `magenta6` | `--ant-magenta-6` | `#EB2F96` | `#eb2f96` | 否 |
| `magenta-7` | `--ant-magenta-7` | `#C41D7F` | `#c41d7f` | 否 |
| `magenta7` | `--ant-magenta-7` | `#C41D7F` | `#c41d7f` | 否 |
| `magenta-8` | `--ant-magenta-8` | `#9E1068` | `#9e1068` | 否 |
| `magenta8` | `--ant-magenta-8` | `#9E1068` | `#9e1068` | 否 |
| `magenta-9` | `--ant-magenta-9` | `#780650` | `#780650` | 否 |
| `magenta9` | `--ant-magenta-9` | `#780650` | `#780650` | 否 |
| `magenta-10` | `--ant-magenta-10` | `#520339` | `#520339` | 否 |
| `magenta10` | `--ant-magenta-10` | `#520339` | `#520339` | 否 |
| `pink-1` | `--ant-pink-1` | `#FFF0F6` | `#fff0f6` | 否 |
| `pink1` | `--ant-pink-1` | `#FFF0F6` | `#fff0f6` | 否 |
| `pink-2` | `--ant-pink-2` | `#FFD6E7` | `#ffd6e7` | 否 |
| `pink2` | `--ant-pink-2` | `#FFD6E7` | `#ffd6e7` | 否 |
| `pink-3` | `--ant-pink-3` | `#FFADD2` | `#ffadd2` | 否 |
| `pink3` | `--ant-pink-3` | `#FFADD2` | `#ffadd2` | 否 |
| `pink-4` | `--ant-pink-4` | `#FF85C0` | `#ff85c0` | 否 |
| `pink4` | `--ant-pink-4` | `#FF85C0` | `#ff85c0` | 否 |
| `pink-5` | `--ant-pink-5` | `#F759AB` | `#f759ab` | 否 |
| `pink5` | `--ant-pink-5` | `#F759AB` | `#f759ab` | 否 |
| `pink-6` | `--ant-pink-6` | `#EB2F96` | `#eb2f96` | 否 |
| `pink6` | `--ant-pink-6` | `#EB2F96` | `#eb2f96` | 否 |
| `pink-7` | `--ant-pink-7` | `#C41D7F` | `#c41d7f` | 否 |
| `pink7` | `--ant-pink-7` | `#C41D7F` | `#c41d7f` | 否 |
| `pink-8` | `--ant-pink-8` | `#9E1068` | `#9e1068` | 否 |
| `pink8` | `--ant-pink-8` | `#9E1068` | `#9e1068` | 否 |
| `pink-9` | `--ant-pink-9` | `#780650` | `#780650` | 否 |
| `pink9` | `--ant-pink-9` | `#780650` | `#780650` | 否 |
| `pink-10` | `--ant-pink-10` | `#520339` | `#520339` | 否 |
| `pink10` | `--ant-pink-10` | `#520339` | `#520339` | 否 |
| `red-1` | `--ant-red-1` | `#FFF1F0` | `#fff1f0` | 否 |
| `red1` | `--ant-red-1` | `#FFF1F0` | `#fff1f0` | 否 |
| `red-2` | `--ant-red-2` | `#FFCCC7` | `#ffccc7` | 否 |
| `red2` | `--ant-red-2` | `#FFCCC7` | `#ffccc7` | 否 |
| `red-3` | `--ant-red-3` | `#FFA39E` | `#ffa39e` | 否 |
| `red3` | `--ant-red-3` | `#FFA39E` | `#ffa39e` | 否 |
| `red-4` | `--ant-red-4` | `#FF7875` | `#ff7875` | 否 |
| `red4` | `--ant-red-4` | `#FF7875` | `#ff7875` | 否 |
| `red-5` | `--ant-red-5` | `#FF4D4F` | `#ff4d4f` | 否 |
| `red5` | `--ant-red-5` | `#FF4D4F` | `#ff4d4f` | 否 |
| `red-6` | `--ant-red-6` | `#F5222D` | `#f5222d` | 否 |
| `red6` | `--ant-red-6` | `#F5222D` | `#f5222d` | 否 |
| `red-7` | `--ant-red-7` | `#CF1322` | `#cf1322` | 否 |
| `red7` | `--ant-red-7` | `#CF1322` | `#cf1322` | 否 |
| `red-8` | `--ant-red-8` | `#A8071A` | `#a8071a` | 否 |
| `red8` | `--ant-red-8` | `#A8071A` | `#a8071a` | 否 |
| `red-9` | `--ant-red-9` | `#820014` | `#820014` | 否 |
| `red9` | `--ant-red-9` | `#820014` | `#820014` | 否 |
| `red-10` | `--ant-red-10` | `#5C0011` | `#5c0011` | 否 |
| `red10` | `--ant-red-10` | `#5C0011` | `#5c0011` | 否 |
| `orange-1` | `--ant-orange-1` | `#FFF7E6` | `#fff7e6` | 否 |
| `orange1` | `--ant-orange-1` | `#FFF7E6` | `#fff7e6` | 否 |
| `orange-2` | `--ant-orange-2` | `#FFE7BA` | `#ffe7ba` | 否 |
| `orange2` | `--ant-orange-2` | `#FFE7BA` | `#ffe7ba` | 否 |
| `orange-3` | `--ant-orange-3` | `#FFD591` | `#ffd591` | 否 |
| `orange3` | `--ant-orange-3` | `#FFD591` | `#ffd591` | 否 |
| `orange-4` | `--ant-orange-4` | `#FFC069` | `#ffc069` | 否 |
| `orange4` | `--ant-orange-4` | `#FFC069` | `#ffc069` | 否 |
| `orange-5` | `--ant-orange-5` | `#FFA940` | `#ffa940` | 否 |
| `orange5` | `--ant-orange-5` | `#FFA940` | `#ffa940` | 否 |
| `orange-6` | `--ant-orange-6` | `#FA8C16` | `#fa8c16` | 否 |
| `orange6` | `--ant-orange-6` | `#FA8C16` | `#fa8c16` | 否 |
| `orange-7` | `--ant-orange-7` | `#D46B08` | `#d46b08` | 否 |
| `orange7` | `--ant-orange-7` | `#D46B08` | `#d46b08` | 否 |
| `orange-8` | `--ant-orange-8` | `#AD4E00` | `#ad4e00` | 否 |
| `orange8` | `--ant-orange-8` | `#AD4E00` | `#ad4e00` | 否 |
| `orange-9` | `--ant-orange-9` | `#873800` | `#873800` | 否 |
| `orange9` | `--ant-orange-9` | `#873800` | `#873800` | 否 |
| `orange-10` | `--ant-orange-10` | `#612500` | `#612500` | 否 |
| `orange10` | `--ant-orange-10` | `#612500` | `#612500` | 否 |
| `yellow-1` | `--ant-yellow-1` | `#FEFFE6` | `#feffe6` | 否 |
| `yellow1` | `--ant-yellow-1` | `#FEFFE6` | `#feffe6` | 否 |
| `yellow-2` | `--ant-yellow-2` | `#FFFFB8` | `#ffffb8` | 否 |
| `yellow2` | `--ant-yellow-2` | `#FFFFB8` | `#ffffb8` | 否 |
| `yellow-3` | `--ant-yellow-3` | `#FFFB8F` | `#fffb8f` | 否 |
| `yellow3` | `--ant-yellow-3` | `#FFFB8F` | `#fffb8f` | 否 |
| `yellow-4` | `--ant-yellow-4` | `#FFF566` | `#fff566` | 否 |
| `yellow4` | `--ant-yellow-4` | `#FFF566` | `#fff566` | 否 |
| `yellow-5` | `--ant-yellow-5` | `#FFEC3D` | `#ffec3d` | 否 |
| `yellow5` | `--ant-yellow-5` | `#FFEC3D` | `#ffec3d` | 否 |
| `yellow-6` | `--ant-yellow-6` | `#FADB14` | `#fadb14` | 否 |
| `yellow6` | `--ant-yellow-6` | `#FADB14` | `#fadb14` | 否 |
| `yellow-7` | `--ant-yellow-7` | `#D4B106` | `#d4b106` | 否 |
| `yellow7` | `--ant-yellow-7` | `#D4B106` | `#d4b106` | 否 |
| `yellow-8` | `--ant-yellow-8` | `#AD8B00` | `#ad8b00` | 否 |
| `yellow8` | `--ant-yellow-8` | `#AD8B00` | `#ad8b00` | 否 |
| `yellow-9` | `--ant-yellow-9` | `#876800` | `#876800` | 否 |
| `yellow9` | `--ant-yellow-9` | `#876800` | `#876800` | 否 |
| `yellow-10` | `--ant-yellow-10` | `#614700` | `#614700` | 否 |
| `yellow10` | `--ant-yellow-10` | `#614700` | `#614700` | 否 |
| `volcano-1` | `--ant-volcano-1` | `#FFF2E8` | `#fff2e8` | 否 |
| `volcano1` | `--ant-volcano-1` | `#FFF2E8` | `#fff2e8` | 否 |
| `volcano-2` | `--ant-volcano-2` | `#FFD8BF` | `#ffd8bf` | 否 |
| `volcano2` | `--ant-volcano-2` | `#FFD8BF` | `#ffd8bf` | 否 |
| `volcano-3` | `--ant-volcano-3` | `#FFBB96` | `#ffbb96` | 否 |
| `volcano3` | `--ant-volcano-3` | `#FFBB96` | `#ffbb96` | 否 |
| `volcano-4` | `--ant-volcano-4` | `#FF9C6E` | `#ff9c6e` | 否 |
| `volcano4` | `--ant-volcano-4` | `#FF9C6E` | `#ff9c6e` | 否 |
| `volcano-5` | `--ant-volcano-5` | `#FF7A45` | `#ff7a45` | 否 |
| `volcano5` | `--ant-volcano-5` | `#FF7A45` | `#ff7a45` | 否 |
| `volcano-6` | `--ant-volcano-6` | `#FA541C` | `#fa541c` | 否 |
| `volcano6` | `--ant-volcano-6` | `#FA541C` | `#fa541c` | 否 |
| `volcano-7` | `--ant-volcano-7` | `#D4380D` | `#d4380d` | 否 |
| `volcano7` | `--ant-volcano-7` | `#D4380D` | `#d4380d` | 否 |
| `volcano-8` | `--ant-volcano-8` | `#AD2102` | `#ad2102` | 否 |
| `volcano8` | `--ant-volcano-8` | `#AD2102` | `#ad2102` | 否 |
| `volcano-9` | `--ant-volcano-9` | `#871400` | `#871400` | 否 |
| `volcano9` | `--ant-volcano-9` | `#871400` | `#871400` | 否 |
| `volcano-10` | `--ant-volcano-10` | `#610B00` | `#610b00` | 否 |
| `volcano10` | `--ant-volcano-10` | `#610B00` | `#610b00` | 否 |
| `geekblue-1` | `--ant-geekblue-1` | `#F0F5FF` | `#f0f5ff` | 否 |
| `geekblue1` | `--ant-geekblue-1` | `#F0F5FF` | `#f0f5ff` | 否 |
| `geekblue-2` | `--ant-geekblue-2` | `#D6E4FF` | `#d6e4ff` | 否 |
| `geekblue2` | `--ant-geekblue-2` | `#D6E4FF` | `#d6e4ff` | 否 |
| `geekblue-3` | `--ant-geekblue-3` | `#ADC6FF` | `#adc6ff` | 否 |
| `geekblue3` | `--ant-geekblue-3` | `#ADC6FF` | `#adc6ff` | 否 |
| `geekblue-4` | `--ant-geekblue-4` | `#85A5FF` | `#85a5ff` | 否 |
| `geekblue4` | `--ant-geekblue-4` | `#85A5FF` | `#85a5ff` | 否 |
| `geekblue-5` | `--ant-geekblue-5` | `#597EF7` | `#597ef7` | 否 |
| `geekblue5` | `--ant-geekblue-5` | `#597EF7` | `#597ef7` | 否 |
| `geekblue-6` | `--ant-geekblue-6` | `#2F54EB` | `#2f54eb` | 否 |
| `geekblue6` | `--ant-geekblue-6` | `#2F54EB` | `#2f54eb` | 否 |
| `geekblue-7` | `--ant-geekblue-7` | `#1D39C4` | `#1d39c4` | 否 |
| `geekblue7` | `--ant-geekblue-7` | `#1D39C4` | `#1d39c4` | 否 |
| `geekblue-8` | `--ant-geekblue-8` | `#10239E` | `#10239e` | 否 |
| `geekblue8` | `--ant-geekblue-8` | `#10239E` | `#10239e` | 否 |
| `geekblue-9` | `--ant-geekblue-9` | `#061178` | `#061178` | 否 |
| `geekblue9` | `--ant-geekblue-9` | `#061178` | `#061178` | 否 |
| `geekblue-10` | `--ant-geekblue-10` | `#030852` | `#030852` | 否 |
| `geekblue10` | `--ant-geekblue-10` | `#030852` | `#030852` | 否 |
| `gold-1` | `--ant-gold-1` | `#FFFBE6` | `#fffbe6` | 否 |
| `gold1` | `--ant-gold-1` | `#FFFBE6` | `#fffbe6` | 否 |
| `gold-2` | `--ant-gold-2` | `#FFF1B8` | `#fff1b8` | 否 |
| `gold2` | `--ant-gold-2` | `#FFF1B8` | `#fff1b8` | 否 |
| `gold-3` | `--ant-gold-3` | `#FFE58F` | `#ffe58f` | 否 |
| `gold3` | `--ant-gold-3` | `#FFE58F` | `#ffe58f` | 否 |
| `gold-4` | `--ant-gold-4` | `#FFD666` | `#ffd666` | 否 |
| `gold4` | `--ant-gold-4` | `#FFD666` | `#ffd666` | 否 |
| `gold-5` | `--ant-gold-5` | `#FFC53D` | `#ffc53d` | 否 |
| `gold5` | `--ant-gold-5` | `#FFC53D` | `#ffc53d` | 否 |
| `gold-6` | `--ant-gold-6` | `#FAAD14` | `#faad14` | 否 |
| `gold6` | `--ant-gold-6` | `#FAAD14` | `#faad14` | 否 |
| `gold-7` | `--ant-gold-7` | `#D48806` | `#d48806` | 否 |
| `gold7` | `--ant-gold-7` | `#D48806` | `#d48806` | 否 |
| `gold-8` | `--ant-gold-8` | `#AD6800` | `#ad6800` | 否 |
| `gold8` | `--ant-gold-8` | `#AD6800` | `#ad6800` | 否 |
| `gold-9` | `--ant-gold-9` | `#874D00` | `#874d00` | 否 |
| `gold9` | `--ant-gold-9` | `#874D00` | `#874d00` | 否 |
| `gold-10` | `--ant-gold-10` | `#613400` | `#613400` | 否 |
| `gold10` | `--ant-gold-10` | `#613400` | `#613400` | 否 |
| `lime-1` | `--ant-lime-1` | `#FCFFE6` | `#fcffe6` | 否 |
| `lime1` | `--ant-lime-1` | `#FCFFE6` | `#fcffe6` | 否 |
| `lime-2` | `--ant-lime-2` | `#F4FFB8` | `#f4ffb8` | 否 |
| `lime2` | `--ant-lime-2` | `#F4FFB8` | `#f4ffb8` | 否 |
| `lime-3` | `--ant-lime-3` | `#EAFF8F` | `#eaff8f` | 否 |
| `lime3` | `--ant-lime-3` | `#EAFF8F` | `#eaff8f` | 否 |
| `lime-4` | `--ant-lime-4` | `#D3F261` | `#d3f261` | 否 |
| `lime4` | `--ant-lime-4` | `#D3F261` | `#d3f261` | 否 |
| `lime-5` | `--ant-lime-5` | `#BAE637` | `#bae637` | 否 |
| `lime5` | `--ant-lime-5` | `#BAE637` | `#bae637` | 否 |
| `lime-6` | `--ant-lime-6` | `#A0D911` | `#a0d911` | 否 |
| `lime6` | `--ant-lime-6` | `#A0D911` | `#a0d911` | 否 |
| `lime-7` | `--ant-lime-7` | `#7CB305` | `#7cb305` | 否 |
| `lime7` | `--ant-lime-7` | `#7CB305` | `#7cb305` | 否 |
| `lime-8` | `--ant-lime-8` | `#5B8C00` | `#5b8c00` | 否 |
| `lime8` | `--ant-lime-8` | `#5B8C00` | `#5b8c00` | 否 |
| `lime-9` | `--ant-lime-9` | `#3F6600` | `#3f6600` | 否 |
| `lime9` | `--ant-lime-9` | `#3F6600` | `#3f6600` | 否 |
| `lime-10` | `--ant-lime-10` | `#254000` | `#254000` | 否 |
| `lime10` | `--ant-lime-10` | `#254000` | `#254000` | 否 |
| `blueHover` | `--ant-blue-hover` | `#4096FF` | `#4096ff` | 否 |
| `blueActive` | `--ant-blue-active` | `#0958D9` | `#0958d9` | 否 |
| `purpleHover` | `--ant-purple-hover` | `#9254DE` | `#9254de` | 否 |
| `purpleActive` | `--ant-purple-active` | `#531DAB` | `#531dab` | 否 |
| `cyanHover` | `--ant-cyan-hover` | `#36CFC9` | `#36cfc9` | 否 |
| `cyanActive` | `--ant-cyan-active` | `#08979C` | `#08979c` | 否 |
| `greenHover` | `--ant-green-hover` | `#73D13D` | `#73d13d` | 否 |
| `greenActive` | `--ant-green-active` | `#389E0D` | `#389e0d` | 否 |
| `magentaHover` | `--ant-magenta-hover` | `#F759AB` | `#f759ab` | 否 |
| `magentaActive` | `--ant-magenta-active` | `#C41D7F` | `#c41d7f` | 否 |
| `pinkHover` | `--ant-pink-hover` | `#F759AB` | `#f759ab` | 否 |
| `pinkActive` | `--ant-pink-active` | `#C41D7F` | `#c41d7f` | 否 |
| `redHover` | `--ant-red-hover` | `#FF4D4F` | `#ff4d4f` | 否 |
| `redActive` | `--ant-red-active` | `#CF1322` | `#cf1322` | 否 |
| `orangeHover` | `--ant-orange-hover` | `#FFA940` | `#ffa940` | 否 |
| `orangeActive` | `--ant-orange-active` | `#D46B08` | `#d46b08` | 否 |
| `yellowHover` | `--ant-yellow-hover` | `#FFEC3D` | `#ffec3d` | 否 |
| `yellowActive` | `--ant-yellow-active` | `#D4B106` | `#d4b106` | 否 |
| `volcanoHover` | `--ant-volcano-hover` | `#FF7A45` | `#ff7a45` | 否 |
| `volcanoActive` | `--ant-volcano-active` | `#D4380D` | `#d4380d` | 否 |
| `geekblueHover` | `--ant-geekblue-hover` | `#597EF7` | `#597ef7` | 否 |
| `geekblueActive` | `--ant-geekblue-active` | `#1D39C4` | `#1d39c4` | 否 |
| `limeHover` | `--ant-lime-hover` | `#BAE637` | `#bae637` | 否 |
| `limeActive` | `--ant-lime-active` | `#7CB305` | `#7cb305` | 否 |
| `goldHover` | `--ant-gold-hover` | `#FFC53D` | `#ffc53d` | 否 |
| `goldActive` | `--ant-gold-active` | `#D48806` | `#d48806` | 否 |

## 项目显式配置的组件颜色

以下是 ConfigProvider 中 Input 的组件级覆盖，不是全局 token。

| 组件 | Token | 十六进制 | 原始值 |
| --- | --- | --- | --- |
| Input | `activeBorderColor` | `#00000000` | `transparent` |
| Input | `hoverBorderColor` | `#00000000` | `transparent` |

## 数据来源与复核

- 主题覆盖和根节点变量：[src/App.tsx](../src/App.tsx)。
- 依赖版本：本地安装的 `antd/package.json`（不使用 package.json 中版本范围推算）。
- 计算方法：`theme.getDesignToken({ token: { colorBgLayout: "#fcfcfc", colorPrimary: "#1d6cff", borderRadius: 14, fontFamily: "Inter, PingFang SC, Microsoft YaHei, sans-serif" } })`，筛选值为单色的 token。
- `blue1` 与 `blue-1` 等是色板别名，本表保留各 token；Ant Design 会将两种命名映射到同一 CSS 变量（例如 `--ant-blue-1`）。
