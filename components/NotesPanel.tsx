"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type NoteResult = { id: number; note: string; flag?: string };

export function NotesPanel({ selectedId }: { selectedId: string | null }) {
  const [notes, setNotes] = useState<Record<number, NoteResult | string>>({});

  useEffect(() => {
    const ids = new Set(["1", "2"]);
    if (selectedId) ids.add(selectedId);

    let active = true;
    void Promise.all([...ids].map(async (id) => {
      try {
        const response = await fetch(`/api/ctf/notes?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!response.ok) return [Number(id), "No note found."] as const;
        return [Number(id), await response.json() as NoteResult] as const;
      } catch {
        return [Number(id), "Not available right now"] as const;
      }
    })).then((results) => {
      if (active) setNotes(Object.fromEntries(results));
    });

    return () => { active = false; };
  }, [selectedId]);

  const selected = selectedId ? notes[Number(selectedId)] : undefined;

  return (
    <section className="notes-panel" id="notes" aria-labelledby="notes-heading">
      <div className="section-heading">
        <span className="micro-label">FIELD ARCHIVE</span>
        <h2 id="notes-heading">Notes</h2>
      </div>
      <nav className="note-index" aria-label="Available notes">
        <Link href="/ctf?id=1#notes">NOTE 01</Link>
        <Link href="/ctf?id=2#notes">NOTE 02</Link>
      </nav>
      <div className="note-list">
        {[1, 2].map((id) => {
          const result = notes[id];
          const content = typeof result === "object" ? result.note : (result || "Retrieving note…");
          return (
            <article className="note-card" key={id}>
              <span className="micro-label">NOTE 0{id}</span>
              <p>{content}</p>
            </article>
          );
        })}
      </div>
      {selectedId && selectedId !== "1" && selectedId !== "2" && (
        <article className="note-card note-card--selected" aria-live="polite">
          <span className="micro-label">REQUESTED NOTE</span>
          {selected ? (
            typeof selected === "object" ? (
              <>
                <p>{selected.note}</p>
                {selected.flag && <code className="flag-value">{selected.flag}</code>}
              </>
            ) : <p>{selected}</p>
          ) : <p>Retrieving note…</p>}
        </article>
      )}
    </section>
  );
}
