import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface EventRow {
  id: string; slug: string; title: string; description: string | null;
  cover_url: string | null; location: string | null; starts_at: string;
  ends_at: string; capacity: number; visibility: "public" | "unlisted";
  hosts: { slug: string; name: string } | null;
}

export default function EventDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase.from("events")
      .select("id, slug, title, description, cover_url, location, starts_at, ends_at, capacity, visibility, hosts(slug, name)")
      .eq("slug", slug).maybeSingle()
      .then(({ data }) => { setEvent(data as any); setLoading(false); });
  }, [slug]);

  const handleRsvp = () => {
    if (!user) { navigate(`/auth?redirect=/events/${slug}`); return; }
    toast.info("RSVP coming soon");
  };

  if (loading) return <div className="container py-12 text-muted-foreground">Loading…</div>;
  if (!event) return <div className="container py-12">Event not found.</div>;

  const ended = new Date(event.ends_at) < new Date();

  return (
    <article className="pb-16">
      <div className="h-64 w-full sm:h-80" style={{
        backgroundImage: event.cover_url ? `url(${event.cover_url})` : "var(--gradient-primary)",
        backgroundSize: "cover", backgroundPosition: "center",
      }} />
      <div className="container -mt-16 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {ended && <Badge variant="secondary">Ended</Badge>}
            {event.visibility === "unlisted" && <Badge variant="outline">Unlisted</Badge>}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{event.title}</h1>
          {event.hosts && (
            <p className="mt-1 text-sm text-muted-foreground">
              Hosted by <a href={`/hosts/${event.hosts.slug}`} className="text-primary hover:underline">{event.hosts.name}</a>
            </p>
          )}
          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{format(new Date(event.starts_at), "EEE, MMM d · p")} – {format(new Date(event.ends_at), "p")}</div>
            {event.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{event.location}</div>}
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Capacity {event.capacity}</div>
          </div>
          {event.description && <div className="mt-6 whitespace-pre-wrap text-foreground">{event.description}</div>}
        </div>
        <aside className="h-fit rounded-xl border border-border bg-card p-6 shadow-sm">
          {ended ? (
            <p className="text-sm text-muted-foreground">This event has ended.</p>
          ) : (
            <Button onClick={handleRsvp} className="w-full" size="lg">RSVP</Button>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Free event · digital ticket on confirmation</p>
        </aside>
      </div>
    </article>
  );
}
