import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDismissOnOutsideClick } from "./useDismissOnOutsideClick";

function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useDismissOnOutsideClick<HTMLDivElement>(open, onClose);
  return (
    <div>
      <div ref={ref} data-testid="inside">
        inside
      </div>
    </div>
  );
}

describe("useDismissOnOutsideClick", () => {
  it("fires onClose when clicking outside the ref element", () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not fire onClose when clicking inside the ref element", () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    fireEvent.pointerDown(screen.getByTestId("inside"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("fires onClose on Escape", () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not attach listeners when closed", () => {
    const onClose = vi.fn();
    render(<Harness open={false} onClose={onClose} />);
    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});