import { Link } from "react-router-dom";
import { ArrowUpRight, Calendar, MapPin, Video } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export interface EventCardData {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  location: string | null;
  online_url?: string | null;
  starts_at: string;
  ends_at: string;
  capacity?: number | null;
  going_count?: number;
  hosts?: { name: string; slug: string } | null;
}

export function EventCard({ event }: { event: EventCardData }) {
  const now = new Date();
  const ended = new Date(event.ends_at) < now;
  const full =
    !ended &&
    typeof event.capacity === "number" &&
    typeof event.going_count === "number" &&
    event.going_count >= event.capacity;
  const isOnline = !event.location && !!event.online_url;

  return (
    <Link to={`/events/${event.slug}`} className="group block">
      <article className="flex h-full flex-col">
        <div className="relative overflow-hidden rounded-3xl bg-secondary">
          <div
            className="aspect-[4/5] w-full transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage: event.cover_url
                ? `url(${event.cover_url})`
                : "var(--gradient-primary)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
            {ended ? (
              <Badge variant="secondary" className="rounded-full bg-background/90 text-foreground">
                Ended
              </Badge>
            ) : full ? (
              <Badge variant="destructive" className="rounded-full">Full</Badge>
            ) : (
              <Badge className="rounded-full bg-background/90 text-foreground hover:bg-background">
                Upcoming
              </Badge>
            )}
          </div>
          <div className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-background/95 text-foreground shadow-md transition-transform group-hover:-translate-y-0.5 group-hover:-rotate-12">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          {event.hosts && (
            <div className="absolute bottom-4 left-4 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
              {event.hosts.name}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 px-1 pt-4">
          <h3 className="font-serif text-xl font-medium leading-snug tracking-tight line-clamp-2 group-hover:text-accent">
            {event.title}
          </h3>
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(event.starts_at), "EEE, MMM d · p")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {isOnline ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              <span className="line-clamp-1">
                {isOnline ? "Online" : event.location || "Location TBA"}
              </span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
