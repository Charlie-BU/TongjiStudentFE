import { useEffect, useMemo, useState } from "react";
import { BulbTwoTone } from "@ant-design/icons";
import { Tag } from "antd";

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

function getSuggestionGroup(suggestions: string[], length: number, offset: number): string[] {
    return Array.from(
        { length },
        (_, index) => suggestions[(offset + index) % suggestions.length],
    );
}

function shuffleArray<T>(items: T[]): T[] {
    const shuffledItems = [...items];
    for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffledItems[index], shuffledItems[randomIndex]] = [
            shuffledItems[randomIndex],
            shuffledItems[index],
        ];
    }
    return shuffledItems;
}

const COFFEE_SUGGESTION = "我在同济大学四平路校区，帮我在最近的瑞幸点一杯橙 C 冰茶。";

type WelcomeSuggestionsProps = {
    isLoggedIn: boolean;
    isStreaming: boolean;
    onSelect: (query: string, requiresLogin: boolean) => void;
};

export function WelcomeSuggestions({
    isLoggedIn,
    isStreaming,
    onSelect,
}: WelcomeSuggestionsProps) {
    const [suggestionPage, setSuggestionPage] = useState(0);
    const [isSuggestionFading, setIsSuggestionFading] = useState(false);
    const publicSuggestions = useMemo(
        () => shuffleArray(PUBLIC_SUGGESTIONS),
        [],
    );
    const loginRequiredSuggestions = useMemo(
        () => shuffleArray(LOGIN_REQUIRED_SUGGESTIONS),
        [],
    );

    useEffect(() => {
        let fadeTimer: number | undefined;
        const rotationTimer = window.setInterval(() => {
            setIsSuggestionFading(true);
            fadeTimer = window.setTimeout(() => {
                setSuggestionPage(
                    (currentPage) => (currentPage + 1) % SUGGESTION_PAGE_COUNT,
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
        ...getSuggestionGroup(publicSuggestions, SUGGESTIONS_PER_GROUP, suggestionOffset).map(
            (query) => ({ query, requiresLogin: false }),
        ),
        ...getSuggestionGroup(loginRequiredSuggestions, SUGGESTIONS_PER_GROUP - 1, suggestionOffset).map(
            (query) => ({ query, requiresLogin: true }),
        ),
    ];

    return (
        <div aria-label="推荐提问" className="welcome-page-suggestions">
            {suggestions.map(({ query, requiresLogin }) => (
                <button
                    aria-disabled={requiresLogin && !isLoggedIn}
                    className={`welcome-page-suggestion${isSuggestionFading ? " welcome-page-suggestions-fading" : ""}`}
                    disabled={isStreaming}
                    key={`${suggestionPage}-${query}`}
                    onClick={() => onSelect(query, requiresLogin)}
                    type="button"
                >
                    <BulbTwoTone className="welcome-page-suggestion-icon" />
                    <span className="welcome-page-suggestion-text">
                        {query}
                        {requiresLogin ? <Tag color="geekblue">需登录</Tag> : null}
                    </span>
                </button>
            ))}
            {/* 常驻推荐不参与轮播，也不受轮播淡出状态影响。 */}
            <button
                aria-disabled={!isLoggedIn}
                className="welcome-page-suggestion"
                disabled={isStreaming}
                onClick={() => onSelect(COFFEE_SUGGESTION, true)}
                type="button"
            >
                <BulbTwoTone
                    className="welcome-page-suggestion-icon"
                    twoToneColor="#fa8c16"
                />
                <span className="welcome-page-suggestion-text">
                    {COFFEE_SUGGESTION}
                    <Tag color="geekblue">需登录</Tag>
                </span>
            </button>
        </div>
    );
}
