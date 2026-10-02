import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Tasks from "./Tasks";

describe("Tasks", () => {
  it("renders nothing", () => {
    const { container } = render(<Tasks />);
    expect(container).toBeEmptyDOMElement();
  });
});
