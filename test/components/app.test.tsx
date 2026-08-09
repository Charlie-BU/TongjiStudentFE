import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../../src/App";

describe("App", () => {
  it("应装配主题与聊天首页", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "同济同学" })).toBeInTheDocument();
    expect(screen.getByLabelText("输入校园问题")).toBeInTheDocument();
  });
});
