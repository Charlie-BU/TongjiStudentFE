// StreamEvent 表示流式聊天界面消费的统一事件。
export type StreamEvent =
  | { type: "status"; label: string; detail: string }
  | { type: "reasoning"; text: string }
  | { type: "tool_started"; id: string; label: string }
  | { type: "tool_completed"; id: string; label: string; durationMs: number }
  | { type: "delta"; text: string }
  | { type: "completed" };

// streamMockReply 模拟 Agent 的工作过程和最终文本流。
export async function* streamMockReply(
  question: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  yield { type: "status", label: "正在理解问题", detail: "整理校园服务相关信息" };
  await wait(560, signal);

  yield {
    type: "reasoning",
    text: "我会先检索公开的校园资料，再把适用范围和下一步整理成简洁的回答。",
  };
  yield { type: "tool_started", id: "knowledge", label: "检索校园知识库" };
  await wait(900, signal);
  yield {
    type: "tool_completed",
    id: "knowledge",
    label: "已找到新生服务指南",
    durationMs: 896,
  };
  yield { type: "status", label: "正在生成回答", detail: "结合资料组织清晰的行动建议" };

  const answer = buildMockAnswer(question);
  for (const chunk of splitText(answer, 9)) {
    await wait(68, signal);
    yield { type: "delta", text: chunk };
  }
  yield { type: "completed" };
}

// buildMockAnswer 根据用户问题生成演示回答。
function buildMockAnswer(question: string): string {
  return `关于“${question}”，这里是模拟的流式回答。\n\n建议你先确认自己的学院和校区，再查看对应的新生服务指南；涉及办理流程时，以最新官方通知为准。\n\n你也可以继续告诉我具体的校区或事项，我会进一步帮你梳理下一步。`;
}

// splitText 将完整回答切分为稳定的流式文本片段。
function splitText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks;
}

// wait 在支持中止的前提下等待模拟事件。
function wait(durationMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, durationMs);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("已停止生成", "AbortError"));
      },
      { once: true },
    );
  });
}
