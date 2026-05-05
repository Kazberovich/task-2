import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { EventCard } from "@/components/events/EventCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Row {
  id: string;
  status: "confirmed" | "waitlisted" | "cancelled";
  events: any;
}

export default function MyEvents() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("rsvps")
      .select("id, status, events(id, slug, title, cover_url, starts_at, ends_at, location, online_url, capacity, hosts(name, slug))")
      .eq("user_id", user.id)
      .in("status", ["confirmed", "waitlisted"])
      .then(({ data }) => {
        setRows((data as any) ?? []);
        setLoading(false);
      });
  }, [user?.id]);

  const now = new Date();
  const upcoming = rows.filter((r) => r.events && new Date(r.events.ends_at) >= now);
  const past = rows.filter((r) => r.events && new Date(r.events.ends_at) < now);

  const renderList = (list: Row[]) =>
    list.length === 0 ? (
      <EmptyState icon={Calendar} title="Nothing here" description="RSVP to events on Explore to fill this list." />
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => (
          <div key={r.id} className="relative">
            <Badge className="absolute right-3 top-3 z-10" variant={r.status === "waitlisted" ? "secondary" : "default"}>
              {r.status === "waitlisted" ? "Waitlisted" : "Going"}
            </Badge>
            <EventCard event={r.events} />
          </div>
        ))}
      </div>
    );

  return (
    <div className="container py-10">
      <PageHeader title="My Events" description="Events you've RSVP'd to or are on the waitlist for." />
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" />
          </div>
        ) : (
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-6">{renderList(upcoming)}</TabsContent>
            <TabsContent value="past" className="mt-6">{renderList(past)}</TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
