import { useEffect, useState } from "react";
import type { PaginatedResponse, SoldRecord } from "@repair-lab/shared";
import { useApi } from "../lib/api";
import AddSoldRecordModal from "../components/AddSoldRecordModal";

function formatMoney(value: number, currency: string): string {
  return currency === "USD" ? `$${value.toFixed(2)}` : `${value.toFixed(2)} ${currency}`;
}

// Authenticated sold page: a list of manually-entered sold records plus the
// "Add sold" dialog. Product suggestions for the dialog are the union of
// products known to listings and to previously-entered sold records.
export default function Sold() {
  const { fetch: apiFetch } = useApi();

  const [products, setProducts] = useState<string[]>([]);
  const [soldProducts, setSoldProducts] = useState<string[]>([]);
  const [soldRecords, setSoldRecords] = useState<SoldRecord[]>([]);
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
    apiFetch("/sold-records?page=1&pageSize=100&sort=sold_date&order=desc")
      .then((res) => res.json() as Promise<PaginatedResponse<SoldRecord>>)
      .then((body) => {
        if (!cancelled) {
          setSoldRecords(body.data);
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
      {soldRecords.length === 0 ? (
        <p className="sold-status">No sold records yet.</p>
      ) : (
        <div className="sold-table-wrapper">
          <table className="sold-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Sub-product</th>
                <th scope="col">Price</th>
                <th scope="col">Sold date</th>
                <th scope="col">Controllers</th>
                <th scope="col">Games</th>
                <th scope="col">Cords</th>
              </tr>
            </thead>
            <tbody>
              {soldRecords.map((record) => (
                <tr key={record.id}>
                  <td data-label="Product">{record.product}</td>
                  <td data-label="Sub-product">
                    {record.sub_product_code ?? "—"}
                  </td>
                  <td data-label="Price">
                    {formatMoney(record.sold_price, "USD")}
                  </td>
                  <td data-label="Sold date">{record.sold_date}</td>
                  <td data-label="Controllers">
                    {record.includes_controllers ? "Yes" : "No"}
                  </td>
                  <td data-label="Games">
                    {record.includes_games ? "Yes" : "No"}
                  </td>
                  <td data-label="Cords">
                    {record.includes_cords ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
