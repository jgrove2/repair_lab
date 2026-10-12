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
  it("renders with Save disabled until a product and price are entered", () => {
    renderModal();

    expect(
      screen.getByRole("dialog", { name: "Add sold record" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Product")).toHaveValue("");
    expect(screen.getByLabelText("Sold price")).toHaveValue(null);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("suggests existing products while typing", async () => {
    renderModal();

    fireEvent.focus(screen.getByLabelText("Product"));
    fireEvent.change(screen.getByLabelText("Product"), {
      target: { value: "wi" },
    });

    expect(
      await screen.findByRole("option", { name: "wii" }),
    ).toBeInTheDocument();
  });

  it("submits a valid record", async () => {
    const { onSaved, onClose } = renderModal();

    fireEvent.change(screen.getByLabelText("Product"), {
      target: { value: "wii" },
    });
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

  it("submits a brand-new product not in the suggestion list", async () => {
    const { onSaved } = renderModal();

    fireEvent.change(screen.getByLabelText("Product"), {
      target: { value: "playstation 2" },
    });
    fireEvent.change(screen.getByLabelText("Sold price"), {
      target: { value: "40" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(submittedBody().product).toBe("playstation 2");
  });

  it("autocompletes the sub-product code from previous codes", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Product"), {
      target: { value: "wii" },
    });
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

    fireEvent.change(screen.getByLabelText("Product"), {
      target: { value: "wii" },
    });
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

  it("clears the sub-product code when a product suggestion is picked", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Product"), {
      target: { value: "wii" },
    });
    fireEvent.change(screen.getByLabelText("Sub-product code"), {
      target: { value: "RVL-001" },
    });
    expect(screen.getByLabelText("Sub-product code")).toHaveValue("RVL-001");

    fireEvent.focus(screen.getByLabelText("Product"));
    fireEvent.change(screen.getByLabelText("Product"), {
      target: { value: "game" },
    });
    const option = await screen.findByRole("option", { name: "gamecube" });
    fireEvent.click(option);

    expect(screen.getByLabelText("Product")).toHaveValue("gamecube");
    expect(screen.getByLabelText("Sub-product code")).toHaveValue("");
  });

  it("selects a sub-product code from the suggestions", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Product"), {
      target: { value: "wii" },
    });
    fireEvent.focus(screen.getByLabelText("Sub-product code"));
    fireEvent.change(screen.getByLabelText("Sub-product code"), {
      target: { value: "RVL" },
    });

    const option = await screen.findByRole("option", { name: "RVL-001" });
    fireEvent.click(option);

    expect(screen.getByLabelText("Sub-product code")).toHaveValue("RVL-001");
  });

  it("shows an error when saving fails", async () => {
    mocks.fetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/sold-records" && init?.method === "POST") {
        return Promise.reject(new Error("API /sold-records failed: 500"));
      }
      return respond({ codes: [] });
    });
    renderModal();

    fireEvent.change(screen.getByLabelText("Product"), {
      target: { value: "wii" },
    });
    fireEvent.change(screen.getByLabelText("Sold price"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Could not save the sold record. Please try again."),
    ).toBeInTheDocument();
  });

  it("closes via the cancel button", () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
  });
});
