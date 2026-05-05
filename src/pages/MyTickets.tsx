import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TicketCard, TicketCardData } from "@/components/tickets/TicketCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Row {
  id: string;
  status: "confirmed" | "waitlisted" | "cancelled";
  events: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    location: string | null;
    online_url: string | null;
    description: string | null;
    hosts: { name: string } | null;
  } | null;
  tickets: { id: string; code: string; status: "valid" | "cancelled" }[];
}

export default function MyTickets() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("rsvps")
      .select(
        "id, status, events(id, title, starts_at, ends_at, location, online_url, description, hosts(name)), tickets(id, code, status)"
      )
      .eq("user_id", user.id)
      .in("status", ["confirmed", "waitlisted"])
      .order("created_at", { ascending: false });
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const cancel = async (rsvpId: string) => {
    setCancellingId(rsvpId);
    const { error } = await supabase.rpc("cancel_rsvp", { _rsvp_id: rsvpId });
    setCancellingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("RSVP cancelled");
    load();
  };

  const now = new Date();
  const toCard = (r: Row): TicketCardData | null => {
    if (!r.events) return null;
    const t = r.tickets?.find((x) => x.status === "valid") ?? r.tickets?.[0];
    return {
      id: t?.id ?? r.id,
      code: t?.code ?? "—",
      status: (t?.status as any) ?? "valid",
      rsvp_status: r.status,
      attendee_name: user?.user_metadata?.display_name ?? user?.email ?? "Attendee",
      attendee_email: user?.email ?? "",
      event: {
        id: r.events.id,
        title: r.events.title,
        starts_at: r.events.starts_at,
        ends_at: r.events.ends_at,
        location: r.events.location,
        online_url: r.events.online_url,
        description: r.events.description,
        host_name: r.events.hosts?.name ?? "Host",
      },
    };
  };

  const upcoming = rows.filter((r) => r.events && new Date(r.events.ends_at) >= now);
  const past = rows.filter((r) => r.events && new Date(r.events.ends_at) < now);

  return (
    <div className="container py-10">
      <PageHeader title="My Tickets" description="Your upcoming and past event tickets." />
      <div className="mt-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Ticket} title="No tickets yet" description="When you RSVP to an event, your digital ticket will appear here." />
        ) : (
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-6 space-y-4">
              {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming tickets.</p>}
              {upcoming.map((r) => {
                const card = toCard(r);
                if (!card) return null;
                return (
                  <TicketCard
                    key={r.id}
                    ticket={card}
                    onCancel={() => cancel(r.id)}
                    cancelling={cancellingId === r.id}
                  />
                );
              })}
            </TabsContent>
            <TabsContent value="past" className="mt-6 space-y-4">
              {past.length === 0 && <p className="text-sm text-muted-foreground">No past tickets.</p>}
              {past.map((r) => {
                const card = toCard(r);
                if (!card) return null;
                return <TicketCard key={r.id} ticket={card} />;
              })}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
