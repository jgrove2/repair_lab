import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentListItem, Location } from "@repair-lab/shared";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  useApi: () => ({ fetch: mocks.fetch }),
}));

import AddComponentModal from "./AddComponentModal";

const component: ComponentListItem = {
  id: "c1",
  name: "10k resistor",
  category: "resistor",
  quantity: 42,
  location_id: "l1",
  cost_per_unit: 0.01,
  sku: "R-10K",
  location_name: "Drawer A",
};

const location: Location = {
  id: "l1",
  name: "Drawer A",
  type: "drawer",
  parent_id: null,
  sort_order: 0,
};

function respond(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function renderModal() {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(<AddComponentModal onClose={onClose} onSaved={onSaved} />);
  return { onClose, onSaved };
}

function submittedBody() {
  const call = mocks.fetch.mock.calls.find(([path]) => path === "/components");
  return JSON.parse((call?.[1] as RequestInit).body as string);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockImplementation((path: string) => {
    if (path.startsWith("/components/search")) {
      return respond({ data: [] });
    }
    if (path.startsWith("/locations/search")) {
      return respond({ data: [] });
    }
    return respond({ data: [] });
  });
});

describe("AddComponentModal", () => {
  it("renders blank, name-gated fields with Add disabled", () => {
    renderModal();

    expect(
      screen.getByRole("dialog", { name: "Add component" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Quantity")).toHaveValue(null);
    expect(screen.getByLabelText("Quantity")).toBeDisabled();
    expect(screen.getByLabelText("Location")).toHaveValue("");
    expect(screen.getByLabelText("Location")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("enables quantity and location once a name is entered", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Cap" },
    });

    expect(screen.getByLabelText("Quantity")).toBeEnabled();
    expect(screen.getByLabelText("Location")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "Drawer B" },
    });

    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("lists components on focus and narrows as you type", async () => {
    mocks.fetch.mockImplementation((path: string) => {
      if (path.startsWith("/components/search?q=zzz")) {
        return respond({ data: [] });
      }
      if (path.startsWith("/components/search")) {
        return respond({ data: [component] });
      }
      return respond({ data: [] });
    });
    renderModal();

    fireEvent.focus(screen.getByLabelText("Name"));

    expect(
      await screen.findByRole("option", { name: /10k resistor/ }),
    ).toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/components/search?q=&limit=50"),
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "10k" },
    });

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/components/search?q=10k&limit=50"),
      ),
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "zzz" },
    });

    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: /10k resistor/ }),
      ).not.toBeInTheDocument(),
    );
  });

  it("autofills the location when an existing component is chosen", async () => {
    mocks.fetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path.startsWith("/components/search")) {
        return respond({ data: [component] });
      }
      if (path === "/components" && init?.method === "POST") {
        return respond({ component, created: false });
      }
      return respond({ data: [] });
    });
    const { onSaved, onClose } = renderModal();

    fireEvent.focus(screen.getByLabelText("Name"));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "10k" },
    });

    const option = await screen.findByRole("option", {
      name: /10k resistor/,
    });
    fireEvent.click(option);

    expect(screen.getByLabelText("Location")).toHaveValue("Drawer A");
    expect(screen.getByLabelText("Location")).toBeDisabled();
    expect(screen.getByLabelText("Name")).toHaveValue("10k resistor");

    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    expect(submittedBody()).toEqual({
      name: "10k resistor",
      quantity: 1,
      location_id: "l1",
    });
  });

  it("submits a new location name when it was not selected", async () => {
    mocks.fetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/components" && init?.method === "POST") {
        return respond({ component, created: true }, 201);
      }
      return respond({ data: [] });
    });
    const { onSaved } = renderModal();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New cap" },
    });
    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "Drawer B" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(submittedBody()).toEqual({
      name: "New cap",
      quantity: 4,
      location_name: "Drawer B",
    });
  });

  it("selects an existing location from the typeahead", async () => {
    mocks.fetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path.startsWith("/locations/search")) {
        return respond({ data: [location] });
      }
      if (path === "/components" && init?.method === "POST") {
        return respond({ component, created: true }, 201);
      }
      return respond({ data: [] });
    });
    const { onSaved } = renderModal();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Cap" },
    });
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "Draw" },
    });

    const option = await screen.findByRole("option", { name: /Drawer A/ });
    fireEvent.click(option);

    expect(screen.getByLabelText("Location")).toHaveValue("Drawer A");
    expect(screen.getByLabelText("Location")).toBeEnabled();

    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(submittedBody()).toEqual({
      name: "Cap",
      quantity: 1,
      location_id: "l1",
    });
  });

  it("rejects a quantity below 1 without submitting", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Cap" },
    });
    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "Drawer B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("Quantity must be a whole number of at least 1."),
    ).toBeInTheDocument();
    expect(
      mocks.fetch.mock.calls.some(([path]) => path === "/components"),
    ).toBe(false);
  });
});
