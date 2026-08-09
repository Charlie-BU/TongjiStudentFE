import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../../src/App";

describe("App", () => {
  it("应装配主题与聊天输入页", () => {
    render(<App />);

    expect(screen.getByLabelText("输入校园问题")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送问题" })).toBeDisabled();
  });
});
