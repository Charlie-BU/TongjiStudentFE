import { ConfigProvider } from "antd";
import { ChatArea } from "./components/chat-area/ChatArea";

// App 负责全局 antd 主题和聊天区域装配。
function App() {
  return (
    <ConfigProvider
      theme={{
        cssVar: {},
        token: {
          colorBgLayout: "#fcfcfc",
          colorPrimary: "#1d6cff",
          borderRadius: 14,
          fontFamily: "Inter, PingFang SC, Microsoft YaHei, sans-serif",
        },
        components: {
          Input: {
            activeBorderColor: "transparent",
            activeShadow: "none",
            hoverBorderColor: "transparent",
            inputFontSize: 16,
          },
        },
      }}
    >
      <ChatArea />
    </ConfigProvider>
  );
}

export default App;
