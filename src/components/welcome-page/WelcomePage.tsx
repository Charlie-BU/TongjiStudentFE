import { useEffect, useState } from "react";
import { BulbTwoTone } from "@ant-design/icons";
import { Tag } from "antd";
import type { ChatController } from "../../hooks/use-chat";
import { ChatInput } from "../chat-input/ChatInput";
import "./WelcomePage.css";

type WelcomePageProps = {
    chat: ChatController;
    isLoggedIn: boolean;
    onLoginRequired: () => void;
    username?: string;
};

const PUBLIC_SUGGESTIONS = [
    "请分别给出四平路和嘉定校区的地图。",
    "新生什么时候报到？要带哪些材料？新生的银行卡怎么申请？怎么激活？",
    "本科生怎么选课？入口在哪？",
    "四平路校区有什么食堂？分别有什么特色？营业时间是什么？",
    "高等数学课程哪些老师评分比较好？",
    "沈坚老师评价怎么样？学生们都是怎么讲的？",
    "下学期什么时候开学、校历怎么安排？",
];

const LOGIN_REQUIRED_SUGGESTIONS = [
    "我这学期的课表是怎样的？",
    "我这学期的成绩怎么样？英语四六级成绩怎么样？",
    "我最近一个月的一卡通消费流水？",
    "我借了哪些书，什么时候该还？",
    "我的宿舍在哪个楼、哪个区？",
    "我拿过哪些奖学金、助学金、竞赛奖项和荣誉称号？",
    "给我看看今年的年度校园卡账单。",
    "我这个月的校门进出记录有哪些？图书馆呢？",
];
const SUGGESTIONS_PER_GROUP = 2;
const SUGGESTION_ROTATION_INTERVAL = 5000;
const SUGGESTION_FADE_DURATION = 280;
const SUGGESTION_PAGE_COUNT = Math.max(
    Math.ceil(PUBLIC_SUGGESTIONS.length / SUGGESTIONS_PER_GROUP),
    Math.ceil(LOGIN_REQUIRED_SUGGESTIONS.length / SUGGESTIONS_PER_GROUP),
);

function getSuggestionGroup(suggestions: string[], offset: number): string[] {
    return Array.from(
        { length: SUGGESTIONS_PER_GROUP },
        (_, index) => suggestions[(offset + index) % suggestions.length],
    );
}

// WelcomePage 在新会话创建前提供与 ChatGPT 相似的居中输入体验。
export function WelcomePage({
    chat,
    isLoggedIn,
    onLoginRequired,
    username,
}: WelcomePageProps) {
    const { input, isStreaming, setInput, stopStreaming, submitQuestion } =
        chat;
    const [suggestionPage, setSuggestionPage] = useState(0);
    const [isSuggestionFading, setIsSuggestionFading] = useState(false);

    useEffect(() => {
        let fadeTimer: number | undefined;
        const rotationTimer = window.setInterval(() => {
            setIsSuggestionFading(true);
            fadeTimer = window.setTimeout(() => {
                setSuggestionPage((currentPage) =>
                    (currentPage + 1) % SUGGESTION_PAGE_COUNT,
                );
                setIsSuggestionFading(false);
            }, SUGGESTION_FADE_DURATION);
        }, SUGGESTION_ROTATION_INTERVAL);

        return () => {
            window.clearInterval(rotationTimer);
            window.clearTimeout(fadeTimer);
        };
    }, []);

    const suggestionOffset = suggestionPage * SUGGESTIONS_PER_GROUP;
    const suggestions = [
        ...getSuggestionGroup(PUBLIC_SUGGESTIONS, suggestionOffset).map(
            (query) => ({ query, requiresLogin: false }),
        ),
        ...getSuggestionGroup(LOGIN_REQUIRED_SUGGESTIONS, suggestionOffset).map(
            (query) => ({ query, requiresLogin: true }),
        ),
    ];

    const submitSuggestion = (suggestion: string, requiresLogin: boolean): void => {
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
                    disabled={isStreaming}
                    onChange={setInput}
                    onStop={stopStreaming}
                    onSubmit={() => void submitQuestion()}
                    value={input}
                />
                <div
                    aria-label="推荐提问"
                    className={`welcome-page-suggestions${
                        isSuggestionFading ? " welcome-page-suggestions-fading" : ""
                    }`}
                >
                    {suggestions.map(({ query, requiresLogin }) => (
                        <button
                            aria-disabled={requiresLogin && !isLoggedIn}
                            className="welcome-page-suggestion"
                            disabled={isStreaming}
                            key={`${suggestionPage}-${query}`}
                            onClick={() => submitSuggestion(query, requiresLogin)}
                            type="button"
                        >
                            <BulbTwoTone className="welcome-page-suggestion-icon" />
                            <span className="welcome-page-suggestion-text">
                                {query}
                                {requiresLogin ? <Tag color="geekblue">需登录</Tag> : null}
                            </span>
                        </button>
                    ))}
                </div>
            </section>
        </main>
    );
}
