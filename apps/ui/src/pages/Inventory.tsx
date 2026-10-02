import { useEffect, useState } from "react";
import type {
  ComponentListItem,
  PaginatedResponse,
} from "@repair-lab/shared";
import { useApi } from "../lib/api";
import AddComponentModal from "../components/AddComponentModal";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "quantity", label: "Quantity" },
  { value: "location", label: "Location" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

// Authenticated inventory page: a server-paginated table of components with a
// sort control and per-row edit action. Add/Edit are placeholders for now.
export default function Inventory() {
  const { fetch: apiFetch } = useApi();
  const [components, setComponents] = useState<ComponentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("name");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    apiFetch(`/components?page=${page}&pageSize=${PAGE_SIZE}&sort=${sort}`)
      .then((res) => res.json() as Promise<PaginatedResponse<ComponentListItem>>)
      .then((body) => {
        if (cancelled) {
          return;
        }
        setComponents(body.data);
        setTotal(body.total);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiFetch, page, sort, reload]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSortChange = (value: string) => {
    setSort(value as SortKey);
    setPage(1);
  };

  return (
    <section className="inventory">
      <h1 className="inventory-title">Inventory</h1>

      <div className="inventory-toolbar">
        <label className="inventory-sort" htmlFor="inventory-sort">
          Sort by
        </label>
        <select
          id="inventory-sort"
          value={sort}
          onChange={(event) => handleSortChange(event.target.value)}
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="inventory-add"
          onClick={() => setAddOpen(true)}
        >
          Add
        </button>
      </div>

      {addOpen && (
        <AddComponentModal
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setPage(1);
            setReload((current) => current + 1);
          }}
        />
      )}

      {error ? (
        <p className="inventory-status">Could not load inventory.</p>
      ) : loading ? (
        <p className="inventory-status">Loading…</p>
      ) : components.length === 0 ? (
        <p className="inventory-status">No components yet.</p>
      ) : (
        <table className="inventory-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Category</th>
              <th scope="col">Quantity</th>
              <th scope="col">Location</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {components.map((component) => (
              <tr key={component.id}>
                <td>{component.name}</td>
                <td>{component.category ?? "—"}</td>
                <td>{component.quantity}</td>
                <td>{component.location_name ?? "—"}</td>
                <td>
                  <button
                    type="button"
                    className="inventory-edit"
                    disabled
                    title="Editing is not available yet"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <nav className="inventory-pagination" aria-label="Pagination">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={loading || page <= 1}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() =>
            setPage((current) => Math.min(totalPages, current + 1))
          }
          disabled={loading || page >= totalPages}
        >
          Next
        </button>
      </nav>
    </section>
  );
}
