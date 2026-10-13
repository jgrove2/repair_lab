import { useEffect, useState } from "react";
import type {
  Listing,
  PaginatedResponse,
  SoldPriceStats,
} from "@repair-lab/shared";
import { useApi } from "../lib/api";

const PAGE_SIZE = 25;

const SORTABLE = [
  { key: "title", label: "Title" },
  { key: "price", label: "Price" },
  { key: "condition", label: "Condition" },
  { key: "shipping_cost", label: "Shipping" },
  { key: "total_cost", label: "Total" },
] as const;

type SortKey = (typeof SORTABLE)[number]["key"];

function formatMoney(value: number | null, currency: string | null): string {
  if (value === null) {
    return "—";
  }
  const amount = value.toFixed(2);
  return currency === "USD" ? `$${amount}` : `${amount} ${currency ?? ""}`.trim();
}

function formatStats(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `$${value.toFixed(2)}`;
}

// Authenticated research dashboard: a product dropdown plus a
// server-sorted/filtered table of the listings the research agent ingested.
// Also hosts manual sold records and an average-sold-price widget.
export default function Listings() {
  const { fetch: apiFetch } = useApi();

  const [products, setProducts] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);

  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("title");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [condition, setCondition] = useState("");
  const [controllers, setControllers] = useState(false);
  const [games, setGames] = useState(false);
  const [cords, setCords] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [soldProducts, setSoldProducts] = useState<string[]>([]);

  const [avgProduct, setAvgProduct] = useState("");
  const [stats, setStats] = useState<SoldPriceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const allProducts = Array.from(new Set([...products, ...soldProducts]));

  useEffect(() => {
    let cancelled = false;
    apiFetch("/listings/filters")
      .then(
        (res) =>
          res.json() as Promise<{ products: string[]; conditions: string[] }>,
      )
      .then((body) => {
        if (!cancelled) {
          setProducts(body.products);
          setConditions(body.conditions);
        }
      })
      .catch(() => {
        /* tabs/filters are best-effort; the table still loads */
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/sold-records/products")
      .then((res) => res.json() as Promise<{ products: string[] }>)
      .then((body) => {
        if (!cancelled) {
          setSoldProducts(body.products ?? []);
        }
      })
      .catch(() => {
        /* best-effort; products still come from listings */
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  useEffect(() => {
    setAvgProduct((current) =>
      current === "" && allProducts.length > 0 ? allProducts[0] : current,
    );
  }, [products, soldProducts]);

  useEffect(() => {
    if (!avgProduct.trim()) {
      setStats(null);
      return;
    }

    let cancelled = false;
    setStatsLoading(true);

    const params = new URLSearchParams();
    params.set("product", avgProduct.trim());

    apiFetch(`/sold-records/average?${params.toString()}`)
      .then((res) => res.json() as Promise<SoldPriceStats>)
      .then((body) => {
        if (cancelled) {
          return;
        }
        setStats(typeof body?.count === "number" ? body : null);
      })
      .catch(() => {
        if (!cancelled) {
          setStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStatsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiFetch, avgProduct]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    params.set("sort", sort);
    params.set("order", order);
    if (avgProduct.trim()) {
      params.set("product", avgProduct.trim());
    }
    if (q) {
      params.set("q", q);
    }
    if (condition) {
      params.set("condition", condition);
    }
    if (controllers) {
      params.set("controllers", "1");
    }
    if (games) {
      params.set("games", "1");
    }
    if (cords) {
      params.set("cords", "1");
    }

    apiFetch(`/listings?${params.toString()}`)
      .then((res) => res.json() as Promise<PaginatedResponse<Listing>>)
      .then((body) => {
        if (cancelled) {
          return;
        }
        setListings(body.data);
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
  }, [apiFetch, avgProduct, page, sort, order, q, condition, controllers, games, cords]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSort = (key: SortKey) => {
    if (sort === key) {
      setOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder("asc");
    }
    setPage(1);
  };

  const sortIndicator = (key: SortKey): string =>
    sort === key ? (order === "asc" ? " ↑" : " ↓") : "";

  return (
    <section className="listings">
      <h1 className="listings-title">Research</h1>

      <section className="sold">
        <h2 className="sold-title">Average sold price</h2>
        <div className="sold-average-toolbar">
          <label className="sold-filter" htmlFor="sold-avg-product">
            Product
          </label>
          <select
            id="sold-avg-product"
            value={avgProduct}
            onChange={(event) => {
              setAvgProduct(event.target.value);
              setPage(1);
            }}
          >
            {allProducts.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="sold-stats" aria-label="Sold price stats">
          {statsLoading ? (
            <span>Loading…</span>
          ) : (
            <>
              <span className="sold-stat">
                Avg <strong>{formatStats(stats?.average)}</strong>
              </span>
              <span className="sold-stat">
                Min <strong>{formatStats(stats?.min)}</strong>
              </span>
              <span className="sold-stat">
                Max <strong>{formatStats(stats?.max)}</strong>
              </span>
              <span className="sold-stat">
                Median <strong>{formatStats(stats?.median)}</strong>
              </span>
              <span className="sold-stat">
                Count <strong>{stats?.count ?? 0}</strong>
              </span>
            </>
          )}
        </div>
      </section>

      <div className="listings-toolbar">
        <input
          type="search"
          className="listings-search"
          placeholder="Search titles…"
          aria-label="Search titles"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <label className="listings-filter" htmlFor="listings-condition">
          Condition
        </label>
        <select
          id="listings-condition"
          value={condition}
          onChange={(event) => {
            setCondition(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All</option>
          {conditions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <label className="listings-checkbox">
          <input
            type="checkbox"
            checked={controllers}
            onChange={(event) => {
              setControllers(event.target.checked);
              setPage(1);
            }}
          />
          Controllers
        </label>
        <label className="listings-checkbox">
          <input
            type="checkbox"
            checked={games}
            onChange={(event) => {
              setGames(event.target.checked);
              setPage(1);
            }}
          />
          Games
        </label>
        <label className="listings-checkbox">
          <input
            type="checkbox"
            checked={cords}
            onChange={(event) => {
              setCords(event.target.checked);
              setPage(1);
            }}
          />
          Cords
        </label>
      </div>

      {error ? (
        <p className="listings-status">Could not load listings.</p>
      ) : loading ? (
        <p className="listings-status">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="listings-status">No listings yet.</p>
      ) : (
        <div className="listings-table-wrapper">
          <table className="listings-table">
            <thead>
              <tr>
                {SORTABLE.map(({ key, label }) => (
                  <th key={key} scope="col">
                    <button
                      type="button"
                      className="listings-sort"
                      onClick={() => handleSort(key)}
                    >
                      {label}
                      {sortIndicator(key)}
                    </button>
                  </th>
                ))}
                <th scope="col">Controllers</th>
                <th scope="col">Games</th>
                <th scope="col">Cords</th>
                <th scope="col">Item ID</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id}>
                  <td data-label="Title">
                    {listing.url ? (
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noreferrer"
                        className="listings-link"
                      >
                        {listing.title}
                      </a>
                    ) : (
                      listing.title
                    )}
                  </td>
                  <td data-label="Price">
                    {formatMoney(listing.price, listing.currency)}
                  </td>
                  <td data-label="Condition">{listing.condition ?? "—"}</td>
                  <td data-label="Shipping">
                    {formatMoney(listing.shipping_cost, listing.shipping_currency)}
                  </td>
                  <td data-label="Total">
                    {formatMoney(listing.total_cost, listing.currency)}
                  </td>
                  <td data-label="Controllers">
                    {listing.includes_controllers ? "Yes" : "No"}
                  </td>
                  <td data-label="Games">
                    {listing.includes_games ? "Yes" : "No"}
                  </td>
                  <td data-label="Cords">
                    {listing.includes_cords ? "Yes" : "No"}
                  </td>
                  <td data-label="Item ID">{listing.item_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav className="listings-pagination" aria-label="Pagination">
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
