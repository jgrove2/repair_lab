import { useEffect, useState, type FormEvent } from "react";
import type { SoldRecord } from "@repair-lab/shared";
import { useApi } from "../lib/api";
import { useDismissOnOutsideClick } from "../hooks/useDismissOnOutsideClick";

type Props = {
  products: string[];
  onClose: () => void;
  onSaved: () => void;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Popup for recording a console you sold. Product is picked from the known
// products; sub-product code is free text with autocomplete from codes
// previously used for that product.
export default function AddSoldRecordModal({
  products,
  onClose,
  onSaved,
}: Props) {
  const { fetch: apiFetch } = useApi();
  const panelRef = useDismissOnOutsideClick<HTMLDivElement>(true, onClose);

  const [product, setProduct] = useState("");
  const [productFocused, setProductFocused] = useState(false);
  const [subCode, setSubCode] = useState("");
  const [price, setPrice] = useState("");
  const [soldDate, setSoldDate] = useState(todayIsoDate());
  const [controllers, setControllers] = useState(false);
  const [games, setGames] = useState(false);
  const [cords, setCords] = useState(false);

  const [subCodes, setSubCodes] = useState<string[]>([]);
  const [subFocused, setSubFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = product.trim() !== "" && price.trim() !== "";

  useEffect(() => {
    if (!product.trim()) {
      setSubCodes([]);
      return;
    }
    let cancelled = false;
    apiFetch(
      `/sold-records/sub-products?product=${encodeURIComponent(product.trim())}`,
    )
      .then((res) => res.json() as Promise<{ codes: string[] }>)
      .then((body) => {
        if (!cancelled) {
          setSubCodes(body.codes);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSubCodes([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch, product]);

  const suggestions = subFocused
    ? subCodes.filter(
        (code) =>
          code.toLowerCase().startsWith(subCode.trim().toLowerCase()) &&
          code !== subCode.trim(),
      )
    : [];

  const productSuggestions = productFocused
    ? products.filter(
        (name) =>
          name.toLowerCase().startsWith(product.trim().toLowerCase()) &&
          name !== product.trim(),
      )
    : [];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedProduct = product.trim();
    if (!trimmedProduct) {
      setError("Product is required.");
      return;
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Price must be a number of at least 0.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiFetch("/sold-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: trimmedProduct,
          ...(subCode.trim() ? { sub_product_code: subCode.trim() } : {}),
          sold_price: parsedPrice,
          sold_date: soldDate,
          controllers,
          games,
          cords,
        }),
      });
      onSaved();
      onClose();
    } catch {
      setError("Could not save the sold record. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add sold record"
        ref={panelRef}
      >
        <h2 className="modal-title">Add sold console</h2>
        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          <div className="modal-field">
            <label htmlFor="sold-product">Product</label>
            <input
              id="sold-product"
              type="text"
              autoComplete="off"
              value={product}
              onFocus={() => setProductFocused(true)}
              onBlur={() => setProductFocused(false)}
              onChange={(event) => setProduct(event.target.value)}
            />
            {productSuggestions.length > 0 && (
              <ul className="modal-suggestions" role="listbox">
                {productSuggestions.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      className="modal-suggestion"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setProduct(name);
                        setSubCode("");
                        setProductFocused(false);
                      }}
                    >
                      <span className="modal-suggestion-name">{name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-field">
            <label htmlFor="sold-sub-code">Sub-product code</label>
            <input
              id="sold-sub-code"
              type="text"
              autoComplete="off"
              value={subCode}
              onFocus={() => setSubFocused(true)}
              onBlur={() => setSubFocused(false)}
              onChange={(event) => setSubCode(event.target.value)}
            />
            {suggestions.length > 0 && (
              <ul className="modal-suggestions" role="listbox">
                {suggestions.map((code) => (
                  <li key={code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      className="modal-suggestion"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSubCode(code);
                        setSubFocused(false);
                      }}
                    >
                      <span className="modal-suggestion-name">{code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-field">
            <label htmlFor="sold-price">Sold price</label>
            <input
              id="sold-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>

          <div className="modal-field">
            <label htmlFor="sold-date">Sold date</label>
            <input
              id="sold-date"
              type="date"
              value={soldDate}
              onChange={(event) => setSoldDate(event.target.value)}
            />
          </div>

          <div className="modal-field">
            <span className="modal-field-label">Included</span>
            <label className="modal-checkbox">
              <input
                type="checkbox"
                checked={controllers}
                onChange={(event) => setControllers(event.target.checked)}
              />
              Controllers
            </label>
            <label className="modal-checkbox">
              <input
                type="checkbox"
                checked={games}
                onChange={(event) => setGames(event.target.checked)}
              />
              Games
            </label>
            <label className="modal-checkbox">
              <input
                type="checkbox"
                checked={cords}
                onChange={(event) => setCords(event.target.checked)}
              />
              Cords
            </label>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="modal-submit"
              disabled={submitting || !canSubmit}
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
