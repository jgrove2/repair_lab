import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Inventory from "./Inventory";

describe("Inventory", () => {
  it("renders nothing", () => {
    const { container } = render(<Inventory />);
    expect(container).toBeEmptyDOMElement();
  });
});
