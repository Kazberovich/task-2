import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Loader2, Undo2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface RecentEntry {
  checkInId: string;
  ticketId: string;
  code: string;
  name: string;
  email: string;
  at: string;
  undone: boolean;
}

export default function CheckIn() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [going, setGoing] = useState(0);
  const [checkedIn, setCheckedIn] = useState(0);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "duplicate" | "error"; message: string } | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = Math.max(0, going - checkedIn);

  const loadCounts = async (id: string) => {
    const [{ count: g }, { count: c }] = await Promise.all([
      supabase.from("rsvps").select("*", { count: "exact", head: true }).eq("event_id", id).eq("status", "confirmed"),
      supabase.from("check_ins").select("*", { count: "exact", head: true }).eq("event_id", id).eq("undone", false),
    ]);
    setGoing(g ?? 0);
    setCheckedIn(c ?? 0);
  };

  useEffect(() => {
    if (!eventId || !user) return;
    setLoading(true);
    supabase
      .from("events")
      .select("id, slug, title, starts_at, ends_at, time_zone, location, online_url, host_id, hosts(name, slug)")
      .eq("id", eventId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setAllowed(false); setLoading(false); return; }
        setEvent(data);
        const { data: ok } = await supabase.rpc("can_check_in_event", { _user_id: user.id, _event_id: eventId });
        setAllowed(!!ok);
        if (ok) await loadCounts(eventId);
        setLoading(false);
      });
  }, [eventId, user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    const raw = code.trim().toUpperCase();
    if (!raw) return;
    setSubmitting(true);
    setFeedback(null);

    const { data: ticket } = await supabase
      .from("tickets")
      .select("id, code, status, user_id, event_id")
      .eq("event_id", eventId)
      .eq("code", raw)
      .maybeSingle();

    if (!ticket || ticket.status !== "valid") {
      setFeedback({ kind: "error", message: `No valid ticket for code ${raw}` });
      setSubmitting(false);
      setCode("");
      inputRef.current?.focus();
      return;
    }

    const { data: existing } = await supabase
      .from("check_ins")
      .select("id, checked_in_at")
      .eq("ticket_id", ticket.id)
      .eq("undone", false)
      .maybeSingle();

    if (existing) {
      setFeedback({
        kind: "duplicate",
        message: `Already checked in at ${format(new Date(existing.checked_in_at), "p")}`,
      });
      setSubmitting(false);
      setCode("");
      inputRef.current?.focus();
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", ticket.user_id)
      .maybeSingle();

    const { data: ins, error } = await supabase
      .from("check_ins")
      .insert({ ticket_id: ticket.id, event_id: eventId, checked_in_by: user!.id })
      .select("id, checked_in_at")
      .single();

    setSubmitting(false);
    if (error) {
      setFeedback({ kind: "error", message: error.message });
      return;
    }

    const name = profile?.display_name ?? profile?.email ?? "Attendee";
    const email = profile?.email ?? "";
    setFeedback({ kind: "success", message: `${name} checked in` });
    setRecent((r) => [
      { checkInId: ins.id, ticketId: ticket.id, code: ticket.code, name, email, at: ins.checked_in_at, undone: false },
      ...r,
    ].slice(0, 25));
    setCode("");
    inputRef.current?.focus();
    loadCounts(eventId);
  };

  const undoLast = async () => {
    const last = recent.find((r) => !r.undone);
    if (!last || !eventId) return;
    const { error } = await supabase.from("check_ins").update({ undone: true }).eq("id", last.checkInId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Undid check-in for ${last.name}`);
    setRecent((r) => r.map((x) => x.checkInId === last.checkInId ? { ...x, undone: true } : x));
    loadCounts(eventId);
  };

  const lastUndoable = useMemo(() => recent.find((r) => !r.undone), [recent]);

  if (loading) {
    return <div className="container py-10 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }
  if (allowed === false) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-semibold">Not authorized</h1>
        <p className="mt-2 text-muted-foreground">You don't have check-in access for this event.</p>
        <Button asChild className="mt-4"><Link to="/">Back home</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/my/events"><ArrowLeft className="mr-1 h-4 w-4" />Back</Link>
      </Button>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(event.starts_at), "EEE, MMM d · p")} · {event.time_zone}
            </p>
            <p className="text-sm text-muted-foreground">Hosted by {event.hosts?.name}</p>
          </div>
          <Badge>Check-in mode</Badge>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Going" value={going} />
          <Stat label="Checked-in" value={checkedIn} />
          <Stat label="Remaining" value={remaining} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <form onSubmit={submit} className="flex gap-2">
              <Input
                ref={inputRef}
                autoFocus
                placeholder="Enter ticket code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={32}
                className="font-mono uppercase"
              />
              <Button type="submit" disabled={submitting || !code.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check in"}
              </Button>
            </form>

            {feedback && (
              <div
                className={
                  "flex items-start gap-2 rounded-md p-3 text-sm " +
                  (feedback.kind === "success"
                    ? "bg-primary/10 text-primary"
                    : feedback.kind === "duplicate"
                    ? "bg-secondary text-foreground"
                    : "bg-destructive/10 text-destructive")
                }
              >
                {feedback.kind === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={undoLast} disabled={!lastUndoable}>
              <Undo2 className="mr-1 h-4 w-4" />Undo last
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold">Recent check-ins (this session)</h3>
            <ul className="mt-3 space-y-2">
              {recent.length === 0 && <li className="text-sm text-muted-foreground">Nothing yet.</li>}
              {recent.map((r) => (
                <li key={r.checkInId} className={"flex items-center justify-between rounded-md border border-border p-2 text-sm " + (r.undone ? "opacity-50" : "") }>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(r.at), "p")}
                    {r.undone && " · undone"}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-secondary p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}