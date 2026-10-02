import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  ComponentListItem,
  ComponentUpsertResult,
  Location,
} from "@repair-lab/shared";
import { useApi } from "../lib/api";
import { useDismissOnOutsideClick } from "../hooks/useDismissOnOutsideClick";

const SEARCH_DEBOUNCE_MS = 200;
const NAME_SUGGESTION_LIMIT = 50;

type Props = {
  onClose: () => void;
  onSaved: () => void;
};

// Popup for adding a component to inventory. Name and Location are typeahead
// inputs: picking an existing component auto-fills its location, while a new
// component/location name is created on submit. Quantity is always added to the
// matched component (or used as the starting quantity for a new one).
export default function AddComponentModal({ onClose, onSaved }: Props) {
  const { fetch: apiFetch } = useApi();
  const panelRef = useDismissOnOutsideClick<HTMLDivElement>(true, onClose);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [locationLocked, setLocationLocked] = useState(false);

  const [nameMatches, setNameMatches] = useState<ComponentListItem[]>([]);
  const [nameFocused, setNameFocused] = useState(false);
  const [locationMatches, setLocationMatches] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasName = name.trim().length > 0;
  const canSubmit =
    hasName && quantity.trim() !== "" && location.trim() !== "";

  // Set when a suggestion is picked so the resulting `name` change does not
  // immediately re-open the name dropdown.
  const skipNameSearch = useRef(false);

  useEffect(() => {
    if (skipNameSearch.current) {
      skipNameSearch.current = false;
      setNameMatches([]);
      return;
    }
    if (!nameFocused) {
      setNameMatches([]);
      return;
    }
    const query = name.trim();

    let cancelled = false;
    const timer = setTimeout(() => {
      apiFetch(
        `/components/search?q=${encodeURIComponent(query)}&limit=${NAME_SUGGESTION_LIMIT}`,
      )
        .then((res) => res.json() as Promise<{ data: ComponentListItem[] }>)
        .then((body) => {
          if (!cancelled) {
            setNameMatches(body.data);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setNameMatches([]);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [apiFetch, name, nameFocused]);

  useEffect(() => {
    const query = location.trim();
    if (!query || locationLocked) {
      setLocationMatches([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      apiFetch(`/locations/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json() as Promise<{ data: Location[] }>)
        .then((body) => {
          if (!cancelled) {
            setLocationMatches(body.data);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setLocationMatches([]);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [apiFetch, location, locationLocked]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (locationLocked) {
      setLocationLocked(false);
      setLocation("");
      setLocationId(null);
    }
  };

  const selectComponent = (component: ComponentListItem) => {
    skipNameSearch.current = true;
    setName(component.name);
    setLocation(component.location_name ?? "");
    setLocationId(component.location_id);
    setLocationLocked(component.location_id !== null);
    setNameMatches([]);
  };

  const selectLocation = (place: Location) => {
    setLocation(place.name);
    setLocationId(place.id);
    setLocationMatches([]);
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    setLocationId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError("Quantity must be a whole number of at least 1.");
      return;
    }

    const trimmedLocation = location.trim();
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch("/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          quantity: parsedQuantity,
          ...(locationId
            ? { location_id: locationId }
            : trimmedLocation
              ? { location_name: trimmedLocation }
              : {}),
        }),
      });
      await (res.json() as Promise<ComponentUpsertResult>);
      onSaved();
      onClose();
    } catch {
      setError("Could not add the component. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add component"
        ref={panelRef}
      >
        <h2 className="modal-title">Add component</h2>
        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          <div className="modal-field">
            <label htmlFor="add-name">Name</label>
            <input
              id="add-name"
              type="text"
              autoComplete="off"
              value={name}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              onChange={(event) => handleNameChange(event.target.value)}
            />
            {nameMatches.length > 0 && (
              <ul className="modal-suggestions" role="listbox">
                {nameMatches.map((match) => (
                  <li key={match.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      className="modal-suggestion"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectComponent(match)}
                    >
                      <span className="modal-suggestion-name">{match.name}</span>
                      {match.location_name && (
                        <span className="modal-suggestion-meta">
                          {match.location_name} · {match.quantity} in stock
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-field">
            <label htmlFor="add-quantity">Quantity</label>
            <input
              id="add-quantity"
              type="number"
              min={1}
              step={1}
              value={quantity}
              disabled={!hasName}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>

          <div className="modal-field">
            <label htmlFor="add-location">Location</label>
            <input
              id="add-location"
              type="text"
              autoComplete="off"
              value={location}
              disabled={!hasName || locationLocked}
              onChange={(event) => handleLocationChange(event.target.value)}
            />
            {locationMatches.length > 0 && (
              <ul className="modal-suggestions" role="listbox">
                {locationMatches.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      className="modal-suggestion"
                      onClick={() => selectLocation(place)}
                    >
                      <span className="modal-suggestion-name">{place.name}</span>
                      <span className="modal-suggestion-meta">{place.type}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
              {submitting ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
