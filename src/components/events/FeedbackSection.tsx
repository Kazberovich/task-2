import { useEffect, useState } from "react";
import { format } from "date-fns";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/common/StarRating";
import { toast } from "sonner";

interface Props {
  eventId: string;
  endsAt: string;
}

interface FeedbackRow {
  id: string; rating: number; comment: string | null; created_at: string;
  user_id: string; hidden: boolean;
}

const schema = z.object({ rating: z.number().min(1).max(5), comment: z.string().max(500).optional() });

export function FeedbackSection({ eventId, endsAt }: Props) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [myRsvp, setMyRsvp] = useState<boolean>(false);
  const [mine, setMine] = useState<FeedbackRow | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const ended = new Date(endsAt) < new Date();

  const load = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("id, rating, comment, created_at, user_id, hidden")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    const list = (data as any[]) ?? [];
    setFeedback(list);
    if (user) setMine(list.find((f) => f.user_id === user.id) ?? null);
    const ids = Array.from(new Set(list.map((f) => f.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      setProfiles(new Map((profs ?? []).map((p: any) => [p.id, p])));
    }
  };

  useEffect(() => {
    load();
    if (user) {
      supabase.from("rsvps").select("status").eq("event_id", eventId).eq("user_id", user.id).maybeSingle()
        .then(({ data }) => setMyRsvp((data as any)?.status === "confirmed"));
    } else setMyRsvp(false);
  }, [eventId, user?.id]);

  const submit = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ rating, comment });
    if (!parsed.success) { toast.error("Please pick a rating from 1–5"); return; }
    setLoading(true);
    const { error } = await supabase.from("feedback").insert({
      event_id: eventId, user_id: user.id, rating, comment: comment.trim() || null,
    } as any);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Feedback submitted");
    setRating(0); setComment("");
    load();
  };

  const visible = feedback.filter((f) => !f.hidden);
  const avg = feedback.length ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : 0;

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">Feedback</h2>
        {feedback.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <StarRating value={Math.round(avg)} readOnly size={16} />
            <span className="font-medium">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">· {feedback.length} review{feedback.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {ended && user && myRsvp && !mine && (
        <div className="mt-4 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">How was it?</p>
          <div className="mt-2"><StarRating value={rating} onChange={setRating} /></div>
          <Textarea
            className="mt-3"
            placeholder="Optional comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
          <Button className="mt-3" onClick={submit} disabled={loading || rating === 0}>
            {loading ? "Submitting…" : "Submit feedback"}
          </Button>
        </div>
      )}
      {ended && user && mine && (
        <p className="mt-3 text-sm text-muted-foreground">Thanks for your feedback ★ {mine.rating}/5</p>
      )}
      {!ended && (
        <p className="mt-3 text-sm text-muted-foreground">Feedback opens after the event ends.</p>
      )}

      <ul className="mt-6 space-y-3">
        {visible.length === 0 && <li className="text-sm text-muted-foreground">No public reviews yet.</li>}
        {visible.map((f) => (
          <li key={f.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{profiles.get(f.user_id)?.display_name ?? "Attendee"}</div>
              <StarRating value={f.rating} readOnly size={14} />
            </div>
            {f.comment && <p className="mt-1 text-sm text-muted-foreground">{f.comment}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{format(new Date(f.created_at), "MMM d, yyyy")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}