import { useEffect, useMemo, useState } from "react";
import { CalendarIcon, Compass, Search, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { EventCard, EventCardData } from "@/components/events/EventCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type EventRow = EventCardData;

export default function Explore() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [includePast, setIncludePast] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();

  useEffect(() => {
    setLoading(true);
    supabase
      .from("events")
      .select(
        "id, slug, title, description, cover_url, location, online_url, starts_at, ends_at, capacity, hosts(name, slug)"
      )
      .eq("status", "published")
      .eq("visibility", "public")
      .order("starts_at", { ascending: true })
      .then(({ data }) => {
        setEvents((data as any as EventRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const q = query.trim().toLowerCase();
    const loc = locationQuery.trim().toLowerCase();
    return events.filter((e: any) => {
      const ended = new Date(e.ends_at) < now;
      if (!includePast && ended) return false;
      if (q) {
        const hay = `${e.title} ${e.description ?? ""} ${e.hosts?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (loc) {
        const hay = `${e.location ?? ""} ${e.online_url ? "online" : ""}`.toLowerCase();
        if (!hay.includes(loc)) return false;
      }
      if (range?.from) {
        const start = new Date(e.starts_at);
        if (start < range.from) return false;
      }
      if (range?.to) {
        const start = new Date(e.starts_at);
        const to = new Date(range.to);
        to.setHours(23, 59, 59, 999);
        if (start > to) return false;
      }
      return true;
    });
  }, [events, query, locationQuery, includePast, range]);

  const hasFilters = !!(query || locationQuery || range?.from || includePast);

  return (
    <>
      <section className="container pt-10 pb-12 sm:pt-16">
        <div className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Community events
            </span>
            <h1 className="mt-5 font-serif text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Where you find{" "}
              <span className="italic text-accent">moments</span>{" "}
              worth showing up for.
            </h1>
          </div>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg md:max-w-md md:justify-self-end">
            Gather brings together free, local, and welcoming events — hosted by
            people who care about the rooms they fill.
          </p>
        </div>
      </section>

      <div className="container pb-16">
        <div className="mb-8 grid gap-3 rounded-3xl border border-border bg-card/60 p-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, description, or host"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 rounded-full border-transparent bg-background"
            />
          </div>
          <Input
            placeholder="Filter by location"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            className="rounded-full border-transparent bg-background"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start rounded-full border-transparent bg-background font-normal",
                  !range?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {range?.from ? (
                  range.to ? (
                    <>
                      {format(range.from, "MMM d")} – {format(range.to, "MMM d")}
                    </>
                  ) : (
                    format(range.from, "MMM d, yyyy")
                  )
                ) : (
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={2}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2 rounded-full bg-background px-4">
            <Switch id="include-past" checked={includePast} onCheckedChange={setIncludePast} />
            <Label htmlFor="include-past" className="cursor-pointer text-sm">
              Include past
            </Label>
          </div>
        </div>

        {hasFilters && (
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filtered.length} {filtered.length === 1 ? "event" : "events"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setLocationQuery("");
                setIncludePast(false);
                setRange(undefined);
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Clear filters
            </Button>
          </div>
        )}

        {loading ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-3xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Compass}
            title={hasFilters ? "No events match your filters" : "No events published yet"}
            description={
              hasFilters
                ? "Try widening your search or clearing filters."
                : "Be the first to host one — once events go live, they'll appear here."
            }
          />
        ) : (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}