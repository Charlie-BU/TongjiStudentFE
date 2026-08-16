import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react";
import { CheckOutlined, CodeOutlined, CopyOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Collapse, Image, Typography } from "antd";
import "katex/dist/katex.min.css";
import ReactMarkdown, { type Components } from "react-markdown";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import {
    type ChatController,
    type ChatTurn,
} from "../../hooks/use-chat";
import { ChatInput } from "../chat-input/ChatInput";
import "./ChatArea.css";

const { Text } = Typography;
const markdownRemarkPlugins = [remarkGfm, remarkBreaks, remarkMath];
const markdownRehypePlugins = [rehypeKatex];
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("md", markdown);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("yml", yaml);
const markdownComponents: Components = {
    code({ children, className, node, ...props }) {
        const language = /language-([\w-]+)/.exec(className ?? "")?.[1];
        const isBlock = node?.position?.start.line !== node?.position?.end.line;

        if (!isBlock) {
            return (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        }

        return <MarkdownCodeBlock code={String(children).replace(/\n$/, "")} language={language} />;
    },
    pre({ children }) {
        return <>{children}</>;
    },
    img({ alt, src, title }) {
        if (!src) {
            return null;
        }

        return (
            <Image
                alt={alt ?? ""}
                className="markdown-image"
                preview={{ mask: "点击放大" }}
                src={src}
                title={title}
            />
        );
    },
};

function MarkdownCodeBlock({
    code,
    language,
}: {
    code: string;
    language?: string;
}) {
    const [isCopied, setIsCopied] = useState(false);
    const resetCopyStateRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        return () => window.clearTimeout(resetCopyStateRef.current);
    }, []);

    const copyCode = async (): Promise<void> => {
        if (!navigator.clipboard) {
            return;
        }

        await navigator.clipboard.writeText(code);
        window.clearTimeout(resetCopyStateRef.current);
        setIsCopied(true);
        resetCopyStateRef.current = window.setTimeout(() => setIsCopied(false), 1600);
    };

    return (
        <div className="markdown-code-wrapper">
            <div className="markdown-code-header">
                <span className="markdown-code-language">
                    <CodeOutlined aria-hidden="true" />
                    {formatCodeLanguage(language)}
                </span>
                <Button
                    aria-label={isCopied ? "已复制代码" : "复制代码"}
                    className="markdown-code-copy-button"
                    icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={() => void copyCode()}
                    type="text"
                />
            </div>
            <SyntaxHighlighter
                className="markdown-code-block"
                codeTagProps={{ className: "markdown-code-content" }}
                customStyle={{
                    background: "transparent",
                    border: "none",
                    margin: 0,
                    padding: "20px",
                }}
                language={language ?? "text"}
                PreTag="div"
                style={oneLight}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
}

function formatCodeLanguage(language?: string): string {
    let formattedLanguage = (language?.charAt(0).toUpperCase() ?? "") + (language?.slice(1) ?? "");
    if (formattedLanguage === "") {
        formattedLanguage = language ?? "";
    }
    const labels: Record<string, string> = {
        bash: "Bash",
        css: "CSS",
        go: "Go",
        java: "Java",
        javascript: "JavaScript",
        js: "JavaScript",
        json: "JSON",
        markdown: "Markdown",
        md: "Markdown",
        python: "Python",
        py: "Python",
        sql: "SQL",
        tsx: "TSX",
        typescript: "TypeScript",
        ts: "TypeScript",
        yaml: "YAML",
        yml: "YAML",
    };
    return formattedLanguage ? (labels[formattedLanguage.toLowerCase()] ?? formattedLanguage) : "Text";
}

type ChatAreaProps = {
    chat: ChatController;
};

// ChatArea 只负责会话展示，调用和状态由 useChat 管理。
export function ChatArea({ chat }: ChatAreaProps) {
    const { input, isStreaming, setInput, stopStreaming, submitQuestion, turns } =
        chat;
    const chatMainRef = useRef<HTMLElement | null>(null);
    const conversationEndRef = useRef<HTMLDivElement | null>(null);
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [scrollbarWidth, setScrollbarWidth] = useState(0);

    const activeTurnStartedAt = turns.find(
        (turn) => turn.state === "streaming",
    )?.startedAt;

    useEffect(() => {
        if (activeTurnStartedAt === undefined) {
            return;
        }

        const updateTime = (): void => setCurrentTime(Date.now());
        updateTime();
        const timer = window.setInterval(updateTime, 1000);

        return () => window.clearInterval(timer);
    }, [activeTurnStartedAt]);

    useEffect(() => {
        conversationEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    }, [turns]);

    useLayoutEffect(() => {
        const chatMain = chatMainRef.current;
        if (!chatMain) {
            return;
        }

        const measureScrollbar = (): void => {
            setScrollbarWidth(chatMain.offsetWidth - chatMain.clientWidth);
        };

        measureScrollbar();
        if (typeof ResizeObserver === "undefined") {
            return;
        }

        const observer = new ResizeObserver(measureScrollbar);
        observer.observe(chatMain);
        return () => observer.disconnect();
    }, [turns]);

    return (
        <main
            className="chat-shell tongji-student-theme"
            style={
                {
                    "--chat-scrollbar-width": `${scrollbarWidth}px`,
                } as CSSProperties
            }
        >
            <section className="chat-main" ref={chatMainRef}>
                <div className="chat-content">
                    <div className="conversation-list">
                        {turns.map((turn) => (
                            <article key={turn.id} className="chat-turn">
                                <div className="message user-message">
                                    <Text>{turn.question}</Text>
                                </div>
                                <div className="assistant-section">
                                    <AgentActivity
                                        key={`${turn.id}-${turn.state}`}
                                        elapsedMs={
                                            turn.durationMs ??
                                            (turn.state === "streaming"
                                                ? currentTime - turn.startedAt
                                                : undefined)
                                        }
                                        turn={turn}
                                    />
                                    <div className="message assistant-message">
                                        {turn.answer ? (
                                            <div className="markdown-content">
                                            <ReactMarkdown
                                                components={markdownComponents}
                                                rehypePlugins={markdownRehypePlugins}
                                                remarkPlugins={markdownRemarkPlugins}
                                            >
                                                {turn.answer}
                                            </ReactMarkdown>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </article>
                        ))}
                        <div className="conversation-end" ref={conversationEndRef} />
                    </div>
                </div>
            </section>

            <ChatInput
                disabled={isStreaming}
                onChange={setInput}
                onStop={stopStreaming}
                onSubmit={() => void submitQuestion()}
                value={input}
            />
        </main>
    );
}

// AgentActivity 展示与最终 Assistant Message 分离的 Agent 工作过程。
function AgentActivity({
    elapsedMs,
    turn,
}: {
    elapsedMs?: number;
    turn: ChatTurn;
}) {
    const [isOpen, setIsOpen] = useState(turn.state === "streaming");
    const activityLabel =
        turn.error ??
        (!turn.answer && turn.state === "aborted"
              ? "本轮回答已停止。"
              : `已工作 ${formatWorkDuration(elapsedMs ?? 0)}`);

    if (turn.activities.length === 0 && !turn.reasoning && !turn.error) {
        return null;
    }

    const activityContent = (
        <div className="activity-content">
            {turn.reasoning ? (
                <div className="reasoning-block markdown-content">
                    <ReactMarkdown
                        components={markdownComponents}
                        rehypePlugins={markdownRehypePlugins}
                        remarkPlugins={markdownRemarkPlugins}
                    >
                        {turn.reasoning}
                    </ReactMarkdown>
                </div>
            ) : null}
            {turn.activities.map((activity) => {
                return (
                    <div key={activity.id} className="activity-row">
                        <SearchOutlined aria-hidden="true" />
                        <Text
                            type="secondary"
                            style={{ fontSize: 16, lineHeight: "24px" }}
                        >
                            {activity.label}
                            {activity.detail ? ` · ${activity.detail}` : ""}
                            {activity.durationMs
                                ? ` · 耗时 ${activity.durationMs}ms`
                                : ""}
                        </Text>
                    </div>
                );
            })}
        </div>
    );

    return (
        <Collapse
            activeKey={isOpen ? ["activity"] : []}
            className={`activity-collapse${isOpen ? " activity-collapse-open" : ""}`}
            ghost
            styles={{
                body: { padding: "0 0" },
                header: {
                    color: "var(--ant-color-text-tertiary)",
                    fontSize: 16,
                    lineHeight: "24px",
                    padding: "0 0 8px",
                },
            }}
            items={[
                {
                    key: "activity",
                    label: activityLabel,
                    children: activityContent,
                },
            ]}
            onChange={(keys) => setIsOpen(keys.includes("activity"))}
        />
    );
}

// formatWorkDuration 将毫秒耗时格式化为面向用户的秒或分钟。
function formatWorkDuration(durationMs: number): string {
    const seconds = Math.max(0, Math.floor(durationMs / 1000));
    return seconds >= 60 ? `${Math.floor(seconds / 60)} 分` : `${seconds} 秒`;
}
