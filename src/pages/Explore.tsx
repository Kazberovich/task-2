import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EventCard, EventCardData } from "@/components/events/EventCard";
import { EmptyState } from "@/components/common/EmptyState";

export default function Explore() {
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, slug, title, cover_url, location, starts_at, ends_at")
      .eq("status", "published")
      .eq("visibility", "public")
      .order("starts_at", { ascending: true })
      .then(({ data }) => {
        setEvents((data as EventCardData[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <section className="border-b border-border" style={{ background: "var(--gradient-hero)" }}>
        <div className="container py-16 text-center text-primary-foreground">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find your next community moment
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">
            Free, local, and welcoming events hosted by people who care.
          </p>
        </div>
      </section>

      <div className="container py-10">
        <h2 className="mb-6 text-xl font-semibold">Upcoming events</h2>
        {loading ? (
          <div className="text-muted-foreground">Loading events…</div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No events published yet"
            description="Be the first to host one — once events go live, they'll appear here."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </>
  );
}