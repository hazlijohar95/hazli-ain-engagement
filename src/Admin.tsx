import { useMutation, useQuery } from "convex/react";
import { Component, useState, type FormEvent, type ReactNode } from "react";
import { errorMessage } from "./lib/hooks";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { inviterLabel } from "./event";
import { HoopMark } from "./logo/HoopMark";

const KEY = "hazli-ain:admin";

function readKey(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function csv(rows: Doc<"rsvps">[]): string {
  const cell = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const lines = rows.map((r) =>
    [r.name, `+${r.phone}`, r.attending === "yes" ? "Attending" : "Declined", r.invitedBy ? inviterLabel(r.invitedBy) : "", r.guests, r.dietary ?? "", new Date(r.updatedAt).toISOString()]
      .map(cell)
      .join(","),
  );
  return ["Name,Phone,Status,Invited by,Guests,Dietary,Updated", ...lines].join("\n");
}

function download(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "rsvps.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Dashboard({ adminKey, onSignOut }: { adminKey: string; onSignOut: () => void }) {
  const data = useQuery(api.admin.overview, { key: adminKey });
  const setHidden = useMutation(api.admin.setWishHidden);
  const [tab, setTab] = useState<"rsvps" | "wishes">("rsvps");

  if (data === undefined) return <p className="admin-note">Loading…</p>;
  const { totals, rsvps, wishes } = data;

  return (
    <>
      <div className="stats">
        {(
          [
            ["Guests coming", totals.guests],
            [`${inviterLabel("hazli")}'s guests`, totals.bySide.hazli],
            [`${inviterLabel("ain")}'s guests`, totals.bySide.ain],
            ["Both", totals.bySide.both],
            ...(totals.bySide.unknown > 0 ? [["Not asked", totals.bySide.unknown] as const] : []),
            ["Attending", totals.attending],
            ["Declined", totals.declined],
            ["Responses", totals.responses],
            ["Dietary notes", totals.dietary],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="stat">
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="seg" role="group" aria-label="Show">
        <button type="button" aria-pressed={tab === "rsvps"} onClick={() => setTab("rsvps")}>
          RSVPs
        </button>
        <button type="button" aria-pressed={tab === "wishes"} onClick={() => setTab("wishes")}>
          Wishes ({wishes.length})
        </button>
      </div>

      {tab === "rsvps" ? (
        <>
          <ul className="admin-list">
            {rsvps.map((r) => (
              <li key={r._id} className="admin-row">
                <div>
                  <p className="admin-name">{r.name}</p>
                  <a className="admin-sub" href={`https://wa.me/${r.phone}`} target="_blank" rel="noreferrer">
                    +{r.phone}
                  </a>
                  {r.invitedBy && <p className="admin-diet">Invited by {inviterLabel(r.invitedBy)}</p>}
                  {r.dietary && <p className="admin-diet">Dietary: {r.dietary}</p>}
                </div>
                <span className="pill" data-yes={r.attending === "yes"}>
                  {r.attending === "yes" ? `${r.guests} coming` : "Declined"}
                </span>
              </li>
            ))}
            {rsvps.length === 0 && <p className="admin-note">No responses yet.</p>}
          </ul>
          {rsvps.length > 0 && (
            <button className="btn btn-outline btn-block" type="button" onClick={() => download(csv(rsvps))}>
              Download CSV
            </button>
          )}
        </>
      ) : (
        <ul className="admin-list">
          {wishes.map((w) => (
            <li key={w._id} className="admin-row admin-wish" data-hidden={w.hidden}>
              <div>
                <p className="admin-name">{w.name}</p>
                <p className="admin-sub">{w.message}</p>
              </div>
              <button className="btn btn-link" type="button" onClick={() => void setHidden({ key: adminKey, id: w._id, hidden: !w.hidden })}>
                {w.hidden ? "Show" : "Hide"}
              </button>
            </li>
          ))}
          {wishes.length === 0 && <p className="admin-note">No wishes yet.</p>}
        </ul>
      )}
      <button className="btn btn-link" type="button" onClick={onSignOut}>
        Sign out
      </button>
    </>
  );
}

/** useQuery throws when the server rejects the key; show that instead of a blank page. */
class KeyBoundary extends Component<{ onSignOut: () => void; children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: unknown) {
    return { error: errorMessage(err) };
  }
  render() {
    if (this.state.error === null) return this.props.children;
    return (
      <div className="form">
        <p className="form-error" role="alert">
          {this.state.error}
        </p>
        <button className="btn btn-primary btn-block" type="button" onClick={this.props.onSignOut}>
          Try another key
        </button>
      </div>
    );
  }
}

export default function Admin() {
  const [adminKey, setAdminKey] = useState(readKey);
  const [draft, setDraft] = useState("");

  const signIn = (e: FormEvent) => {
    e.preventDefault();
    try {
      sessionStorage.setItem(KEY, draft);
    } catch {
      /* session only */
    }
    setAdminKey(draft);
  };

  const signOut = () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nothing stored */
    }
    setAdminKey("");
    setDraft("");
  };

  return (
    <div className="admin">
      <header className="admin-head">
        <HoopMark size={64} variant="icon" />
        <h1 className="section-title">Guest list</h1>
      </header>
      {adminKey ? (
        <KeyBoundary onSignOut={signOut}>
          <Dashboard adminKey={adminKey} onSignOut={signOut} />
        </KeyBoundary>
      ) : (
        <form className="form" onSubmit={signIn}>
          <label className="field">
            <span className="field-label">Admin key</span>
            <input className="input" type="password" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="current-password" />
          </label>
          <button className="btn btn-primary btn-block" type="submit">
            Open
          </button>
        </form>
      )}
    </div>
  );
}
