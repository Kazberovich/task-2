import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Calendar, Clock, ExternalLink, Globe, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  location: string | null;
  online_url: string | null;
  starts_at: string;
  ends_at: string;
  time_zone: string;
  capacity: number;
  visibility: "public" | "unlisted";
  hosts: { slug: string; name: string; avatar_url: string | null; bio: string | null } | null;
}

export default function EventDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [goingCount, setGoingCount] = useState<number>(0);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    supabase
      .from("events")
      .select(
        "id, slug, title, description, cover_url, location, online_url, starts_at, ends_at, time_zone, capacity, visibility, hosts(slug, name, avatar_url, bio)"
      )
      .eq("slug", slug)
      .maybeSingle()
      .then(async ({ data }) => {
        setEvent(data as any);
        if (data) {
          const { count } = await supabase
            .from("rsvps")
            .select("*", { count: "exact", head: true })
            .eq("event_id", (data as any).id)
            .eq("status", "confirmed");
          setGoingCount(count ?? 0);
        }
        setLoading(false);
      });
  }, [slug]);

  // Social preview meta (basic, client-side)
  useEffect(() => {
    if (!event) return;
    const prevTitle = document.title;
    document.title = `${event.title} · Gather`;
    const setMeta = (attr: "name" | "property", key: string, value: string) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };
    const desc = (event.description ?? "Free community event on Gather.").slice(0, 155);
    setMeta("name", "description", desc);
    setMeta("property", "og:title", event.title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", "event");
    if (event.cover_url) setMeta("property", "og:image", event.cover_url);
    setMeta("name", "twitter:card", "summary_large_image");
    return () => {
      document.title = prevTitle;
    };
  }, [event]);

  if (loading) {
    return (
      <div className="container py-10 space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }
  if (!event) return <div className="container py-12">Event not found.</div>;

  const now = new Date();
  const ended = new Date(event.ends_at) < now;
  const isOnline = !event.location && !!event.online_url;
  const remaining = Math.max(0, event.capacity - goingCount);
  const full = !ended && remaining === 0;

  const handleRsvp = () => {
    if (!user) {
      navigate(`/auth?redirect=/events/${slug}`);
      return;
    }
    toast.info("RSVP coming soon");
  };

  return (
    <article className="pb-16">
      <div
        className="h-64 w-full sm:h-80"
        style={{
          backgroundImage: event.cover_url ? `url(${event.cover_url})` : "var(--gradient-primary)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="container -mt-16 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {ended ? (
              <Badge variant="secondary">Ended</Badge>
            ) : full ? (
              <Badge variant="destructive">Full</Badge>
            ) : (
              <Badge>Upcoming</Badge>
            )}
            {event.visibility === "unlisted" && <Badge variant="outline">Unlisted</Badge>}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{event.title}</h1>
          {event.hosts && (
            <p className="mt-1 text-sm text-muted-foreground">
              Hosted by{" "}
              <Link to={`/hosts/${event.hosts.slug}`} className="text-primary hover:underline">
                {event.hosts.name}
              </Link>
            </p>
          )}

          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div>
                  {format(new Date(event.starts_at), "EEE, MMM d, yyyy · p")} –{" "}
                  {format(new Date(event.ends_at), "p")}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {event.time_zone}
                </div>
              </div>
            </div>
            {isOnline ? (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>Online event</span>
                {!ended && user && event.online_url && (
                  <a
                    href={event.online_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Join link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : event.location ? (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{event.location}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {goingCount} going · {remaining} of {event.capacity} spots left
              </span>
            </div>
          </div>

          {event.description && (
            <div className="mt-6 whitespace-pre-wrap text-foreground">{event.description}</div>
          )}

          {event.hosts && (
            <div className="mt-8 flex items-start gap-3 rounded-lg border border-border p-4">
              <div
                className="h-12 w-12 shrink-0 rounded-full bg-secondary"
                style={{
                  backgroundImage: event.hosts.avatar_url ? `url(${event.hosts.avatar_url})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="min-w-0">
                <Link to={`/hosts/${event.hosts.slug}`} className="font-medium hover:text-primary">
                  {event.hosts.name}
                </Link>
                {event.hosts.bio && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{event.hosts.bio}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="h-fit space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          {ended ? (
            <div className="rounded-md bg-secondary p-3 text-center text-sm font-medium">
              This event has ended
            </div>
          ) : full ? (
            <Button disabled className="w-full" size="lg">
              Sold out
            </Button>
          ) : (
            <Button onClick={handleRsvp} className="w-full" size="lg">
              RSVP
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Free event · digital ticket on confirmation
          </p>
        </aside>
      </div>
    </article>
  );
}
