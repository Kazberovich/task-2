import { Link } from "react-router-dom";
import { Calendar, MapPin, Video } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      <Card
        className="flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div
          className="aspect-[16/9] w-full bg-secondary"
          style={{
            backgroundImage: event.cover_url ? `url(${event.cover_url})` : "var(--gradient-primary)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <CardContent className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {ended ? (
              <Badge variant="secondary">Ended</Badge>
            ) : full ? (
              <Badge variant="destructive">Full</Badge>
            ) : (
              <Badge>Upcoming</Badge>
            )}
          </div>
          <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
            {event.title}
          </h3>
          {event.hosts && (
            <p className="text-xs text-muted-foreground">by {event.hosts.name}</p>
          )}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(event.starts_at), "EEE, MMM d · p")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isOnline ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
            <span className="line-clamp-1">
              {isOnline ? "Online" : event.location || "Location TBA"}
            </span>
          </div>
          <div className="mt-auto pt-3">
            <Button variant="outline" size="sm" className="w-full">View details</Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
