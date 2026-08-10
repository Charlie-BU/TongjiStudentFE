# Whitelist（Commit Diff Review 豁免清单）

用于登记“已知但暂时允许”的审查问题。  
该文件可随时更新，审查时命中条目会标记为 `WAIVED`。

## 使用原则

- 仅豁免短期可解释问题，不豁免安全红线
- 每条尽量设置 `expires_at`，避免永久失效
- 代码已修复后应及时删除对应条目

## 2026-08 Markdown 渲染首屏包体积

- match: `package.json` 中的 `react-markdown` 依赖，以及 `src/components/chat-area/ChatArea.tsx` 中的静态导入。
- issue: `react-markdown` 使聊天首屏 JavaScript 增加约 113 kB（约 34 kB gzip）。
- reason: Markdown 渲染是当前聊天回答展示的必要能力；在缺少真实用户网络与性能数据前，暂不为该功能引入异步加载和回退状态的额外复杂度。
- expires_at: `2026-09-10`
- owner: `TongjiStudentFE maintainers`
