import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { EventCard, EventCardData } from "@/components/events/EventCard";

interface HostRow { id: string; name: string; bio: string | null; banner_url: string | null; avatar_url: string | null; }

export default function HostPage() {
  const { slug } = useParams();
  const [host, setHost] = useState<HostRow | null>(null);
  const [events, setEvents] = useState<EventCardData[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: h } = await supabase.from("hosts").select("id, name, bio, banner_url, avatar_url").eq("slug", slug).maybeSingle();
      setHost(h as any);
      if (h) {
        const { data: ev } = await supabase.from("events")
          .select("id, slug, title, cover_url, location, starts_at, ends_at")
          .eq("host_id", (h as any).id).eq("status", "published").eq("visibility", "public")
          .order("starts_at", { ascending: false });
        setEvents((ev as any) ?? []);
      }
    })();
  }, [slug]);

  if (!host) return <div className="container py-12 text-muted-foreground">Loading…</div>;

  return (
    <>
      <div className="h-48 w-full" style={{ backgroundImage: host.banner_url ? `url(${host.banner_url})` : "var(--gradient-primary)", backgroundSize: "cover" }} />
      <div className="container py-8">
        <h1 className="text-3xl font-bold">{host.name}</h1>
        {host.bio && <p className="mt-2 max-w-2xl text-muted-foreground">{host.bio}</p>}
        <h2 className="mb-4 mt-10 text-xl font-semibold">Events</h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground">No public events yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </>
  );
}
