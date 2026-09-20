import type { ChatController } from "../../hooks/use-chat";
import { ChatInput } from "../chat-input/ChatInput";
import { WelcomeSuggestions } from "./WelcomeSuggestions";
import "./WelcomePage.css";

type WelcomePageProps = {
    chat: ChatController;
    isLoggedIn: boolean;
    onLoginRequired: () => void;
    username?: string;
};

// WelcomePage 在新会话创建前提供与 ChatGPT 相似的居中输入体验。
export function WelcomePage({
    chat,
    isLoggedIn,
    onLoginRequired,
    username,
}: WelcomePageProps) {
    const { input, isStreaming, setInput, stopStreaming, submitQuestion } =
        chat;
    const submitSuggestion = (
        suggestion: string,
        requiresLogin: boolean,
    ): void => {
        if (requiresLogin && !isLoggedIn) {
            onLoginRequired();
            return;
        }
        setInput(suggestion);
        void submitQuestion(suggestion);
    };

    return (
        <main className="welcome-page tongji-student-theme">
            <section
                className="welcome-page-content"
                aria-labelledby="welcome-page-title"
            >
                <p className="welcome-page-title" id="welcome-page-title">
                    <span className="welcome-page-title-desktop">
                        {(username ? `Hi, ${username}！` : "") +
                            "今天想了解什么？"}
                    </span>
                    <span className="welcome-page-title-mobile">
                        {username
                            ? `${username}，今天想了解什么？`
                            : "今天想了解什么？"}
                    </span>
                </p>
                <ChatInput
                    modelTier={chat.modelTier}
                    onModelTierChange={chat.setModelTier}
                    disabled={isStreaming}
                    onChange={setInput}
                    onStop={stopStreaming}
                    onSubmit={() => void submitQuestion()}
                    value={input}
                />
                <WelcomeSuggestions
                    isLoggedIn={isLoggedIn}
                    isStreaming={isStreaming}
                    onSelect={submitSuggestion}
                />
            </section>
            <footer className="welcome-page-copyright">
                © 2026 同济破壁工作室 · {" "}
                <a
                    href="https://tongji-poby.feishu.cn/share/base/form/shrcnaw6IqDVMtbWKY9XCOvGl8b"
                    rel="noreferrer"
                    target="_blank"
                >
                    公测反馈
                </a>
            </footer>
        </main>
    );
}
