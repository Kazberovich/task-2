import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

export interface EventCardData {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
}

export function EventCard({ event }: { event: EventCardData }) {
  const ended = new Date(event.ends_at) < new Date();
  return (
    <Link to={`/events/${event.slug}`} className="group block">
      <Card className="overflow-hidden transition-all hover:-translate-y-0.5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div
          className="aspect-[16/9] w-full bg-secondary"
          style={{
            backgroundImage: event.cover_url ? `url(${event.cover_url})` : "var(--gradient-primary)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {ended && (
              <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">Ended</span>
            )}
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(event.starts_at), "MMM d, p")}</span>
          </div>
          <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
            {event.title}
          </h3>
          {event.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
