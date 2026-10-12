import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  useApi: () => ({ fetch: mocks.fetch }),
}));

import AddSoldRecordModal from "./AddSoldRecordModal";

function respond(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function renderModal(products = ["wii", "gamecube"]) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <AddSoldRecordModal products={products} onClose={onClose} onSaved={onSaved} />,
  );
  return { onClose, onSaved };
}

function submittedBody() {
  const call = mocks.fetch.mock.calls.find(([path]) => path === "/sold-records");
  return JSON.parse((call?.[1] as RequestInit).body as string);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockImplementation((path: string, init?: RequestInit) => {
    if (path.startsWith("/sold-records/sub-products")) {
      return respond({ codes: ["RVL-001", "RVL-101"] });
    }
    if (path === "/sold-records" && init?.method === "POST") {
      return respond({ record: { id: "s1" } }, 201);
    }
    return respond({});
  });
});

describe("AddSoldRecordModal", () => {
  it("renders with Save disabled until a price is entered", () => {
    renderModal();

    expect(
      screen.getByRole("dialog", { name: "Add sold record" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Product")).toHaveValue("wii");
    expect(screen.getByLabelText("Sold price")).toHaveValue(null);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("submits a valid record", async () => {
    const { onSaved, onClose } = renderModal();

    fireEvent.change(screen.getByLabelText("Sub-product code"), {
      target: { value: "RVL-001" },
    });
    fireEvent.change(screen.getByLabelText("Sold price"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Controllers" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Cords" }));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();

    const body = submittedBody();
    expect(body.product).toBe("wii");
    expect(body.sub_product_code).toBe("RVL-001");
    expect(body.sold_price).toBe(30);
    expect(body.sold_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.controllers).toBe(true);
    expect(body.games).toBe(false);
    expect(body.cords).toBe(true);
  });

  it("autocompletes the sub-product code from previous codes", async () => {
    renderModal();

    fireEvent.focus(screen.getByLabelText("Sub-product code"));
    fireEvent.change(screen.getByLabelText("Sub-product code"), {
      target: { value: "RVL" },
    });

    expect(
      await screen.findByRole("option", { name: "RVL-001" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "RVL-101" })).toBeInTheDocument();
  });

  it("rejects a negative price without submitting", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Sold price"), {
      target: { value: "-5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Price must be a number of at least 0."),
    ).toBeInTheDocument();
    expect(
      mocks.fetch.mock.calls.some(([path]) => path === "/sold-records"),
    ).toBe(false);
  });
});
