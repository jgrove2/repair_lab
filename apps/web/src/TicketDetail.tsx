import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, MOCK } from "./lib/api";
import type { Ticket } from "@repair-lab/shared";

export function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState<{ id: string; body: string }[]>([]);

  useEffect(() => {
    if (MOCK || !id) {
      setTicket({
        id: id ?? "tkt-ps2-laser",
        item_id: "item-ps2-parts",
        title: "PS2 laser swap (dummy)",
        status: "in_progress",
        priority: 1,
        description: "Dummy ticket: replace laser, clean lens.",
        created_at: "",
        updated_at: "",
      });
      setNotes([{ id: "note-ps2-1", body: "Dummy note: lens cleaned, still DRE." }]);
      return;
    }
    api.ticket(id).then(setTicket).catch(() => setTicket(null));
    api.ticketNotes(id).then(setNotes).catch(() => setNotes([]));
  }, [id]);

  if (!ticket) return <p>Ticket not found (dummy).</p>;
  return (
    <div>
      <h1>{ticket.title}</h1>
      <p>Status: {ticket.status}</p>
      <p>{ticket.description}</p>
      <h2>Notes</h2>
      {notes.map((n) => (
        <div className="card" key={n.id}>{n.body}</div>
      ))}
    </div>
  );
}
