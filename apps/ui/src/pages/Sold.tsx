import { useEffect, useState } from "react";
import type { SoldProductSummary } from "@repair-lab/shared";
import { useApi } from "../lib/api";
import AddSoldRecordModal from "../components/AddSoldRecordModal";

function formatMoney(value: number | null, currency: string): string {
  if (value === null) {
    return "—";
  }
  return currency === "USD" ? `$${value.toFixed(2)}` : `${value.toFixed(2)} ${currency}`;
}

function formatCount(value: number): string {
  return String(value);
}

// Authenticated sold page: read-only summary cards (one per product) showing
// per-sub-product average/median/count plus an overall average. The "Add sold"
// dialog is the only way to enter data.
export default function Sold() {
  const { fetch: apiFetch } = useApi();

  const [products, setProducts] = useState<string[]>([]);
  const [soldProducts, setSoldProducts] = useState<string[]>([]);
  const [summary, setSummary] = useState<SoldProductSummary[]>([]);
  const [soldReload, setSoldReload] = useState(0);
  const [addSoldOpen, setAddSoldOpen] = useState(false);

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
        }
      })
      .catch(() => {
        /* best-effort; suggestions still come from sold records */
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
        /* best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/sold-records/summary")
      .then((res) => res.json() as Promise<{ products: SoldProductSummary[] }>)
      .then((body) => {
        if (!cancelled) {
          setSummary(body.products ?? []);
        }
      })
      .catch(() => {
        /* best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch, soldReload]);

  return (
    <section className="sold">
      <h1 className="sold-title">Sold</h1>

      <div className="sold-toolbar">
        <button
          type="button"
          className="sold-add"
          onClick={() => setAddSoldOpen(true)}
        >
          Add sold
        </button>
      </div>
      {addSoldOpen && (
        <AddSoldRecordModal
          products={allProducts}
          onClose={() => setAddSoldOpen(false)}
          onSaved={() => setSoldReload((current) => current + 1)}
        />
      )}
      {summary.length === 0 ? (
        <p className="sold-status">No sold records yet.</p>
      ) : (
        <div className="sold-cards">
          {summary.map((product) => (
            <article className="sold-card" key={product.product}>
              <h2 className="sold-card-title">{product.product}</h2>
              <ul className="sold-card-subs">
                {product.sub_products.map((sub) => (
                  <li className="sold-card-sub" key={sub.sub_product_code ?? "__none__"}>
                    <span className="sold-card-sub-code">
                      {sub.sub_product_code ?? "—"}
                    </span>
                    <span className="sold-stat">
                      Avg{" "}
                      <strong>
                        {formatMoney(sub.stats.average, "USD")}
                      </strong>
                    </span>
                    <span className="sold-stat">
                      Median{" "}
                      <strong>
                        {formatMoney(sub.stats.median, "USD")}
                      </strong>
                    </span>
                    <span className="sold-stat">
                      Count{" "}
                      <strong>{formatCount(sub.stats.count)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="sold-card-overall">
                <span className="sold-stat">
                  Avg{" "}
                  <strong>{formatMoney(product.overall.average, "USD")}</strong>
                </span>
                <span className="sold-stat">
                  Count <strong>{formatCount(product.overall.count)}</strong>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
