import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./Home";

describe("Home", () => {
  it("renders nothing", () => {
    const { container } = render(<Home />);
    expect(container).toBeEmptyDOMElement();
  });
});
