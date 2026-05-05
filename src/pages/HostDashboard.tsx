import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Copy, Download, Eye, LayoutDashboard, Pencil, Plus, ScanLine, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EventForm, EventFormValues } from "@/components/events/EventForm";
import { slugify, randomSuffix } from "@/lib/slug";

interface EventRow {
  id: string; slug: string; title: string; description: string | null; cover_url: string | null;
  location: string | null; online_url: string | null; starts_at: string; ends_at: string;
  capacity: number; visibility: "public" | "unlisted"; status: "draft" | "published";
  is_paid: boolean; time_zone: string; host_id: string;
}

export default function HostDashboard() {
  const { user, hostMemberships } = useAuth();
  const managerHosts = useMemo(
    () => hostMemberships.filter((m) => m.role === "owner" || m.role === "manager"),
    [hostMemberships],
  );
  const [hostId, setHostId] = useState<string>("");
  useEffect(() => {
    if (!hostId && managerHosts[0]) setHostId(managerHosts[0].host_id);
  }, [managerHosts, hostId]);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, { confirmed: number; waitlist: number; checked_in: number }>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<EventFormValues> | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);

  const load = async () => {
    if (!hostId) return;
    setLoading(true);
    const { data, error } = await supabase.from("events")
      .select("id, slug, title, description, cover_url, location, online_url, starts_at, ends_at, capacity, visibility, status, is_paid, time_zone, host_id")
      .eq("host_id", hostId).order("starts_at", { ascending: false });
    if (error) toast.error(error.message);
    const list = (data as EventRow[]) ?? [];
    setEvents(list);

    if (list.length) {
      const ids = list.map((e) => e.id);
      const [{ data: rsvps }, { data: cins }] = await Promise.all([
        supabase.from("rsvps").select("event_id, status").in("event_id", ids),
        supabase.from("check_ins").select("event_id, undone").in("event_id", ids),
      ]);
      const counts: Record<string, { confirmed: number; waitlist: number; checked_in: number }> = {};
      ids.forEach((id) => (counts[id] = { confirmed: 0, waitlist: 0, checked_in: 0 }));
      (rsvps ?? []).forEach((r: any) => {
        if (r.status === "confirmed") counts[r.event_id].confirmed++;
        else if (r.status === "waitlist") counts[r.event_id].waitlist++;
      });
      (cins ?? []).forEach((c: any) => { if (!c.undone) counts[c.event_id].checked_in++; });
      setRsvpCounts(counts);
    } else {
      setRsvpCounts({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hostId]);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.ends_at) >= now);
  const past = events.filter((e) => new Date(e.ends_at) < now);

  const onPublishToggle = async (e: EventRow) => {
    const next = e.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("events").update({ status: next }).eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success(next === "published" ? "Published" : "Unpublished");
    load();
  };

  const onDuplicate = async (e: EventRow) => {
    if (!user) return;
    const baseSlug = slugify(e.title) || "event";
    const { error } = await supabase.from("events").insert({
      host_id: e.host_id, title: `${e.title} (copy)`, description: e.description, cover_url: e.cover_url,
      location: e.location, online_url: e.online_url, starts_at: e.starts_at, ends_at: e.ends_at,
      capacity: e.capacity, visibility: e.visibility, status: "draft", is_paid: false,
      time_zone: e.time_zone, slug: `${baseSlug}-${randomSuffix()}`, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Event duplicated as draft");
    load();
  };

  const tryDelete = async (e: EventRow) => {
    const c = rsvpCounts[e.id];
    if (c && (c.confirmed + c.waitlist) > 0) {
      toast.error("This event has RSVPs. Unpublish it instead.");
      return;
    }
    setDeleteTarget(e);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Event deleted"); load(); }
    setDeleteTarget(null);
  };

  const openCreate = () => { setEditing(undefined); setFormOpen(true); };
  const openEdit = (e: EventRow) => {
    setEditing({
      id: e.id, host_id: e.host_id, title: e.title, description: e.description,
      starts_at: e.starts_at, ends_at: e.ends_at, time_zone: e.time_zone,
      location: e.location, online_url: e.online_url, capacity: e.capacity,
      cover_url: e.cover_url, visibility: e.visibility, status: e.status, is_paid: e.is_paid,
    });
    setFormOpen(true);
  };

  if (managerHosts.length === 0) {
    return (
      <div className="container py-10">
        <PageHeader title="Host Dashboard" />
        <div className="mt-8">
          <EmptyState
            icon={LayoutDashboard}
            title="You're not managing a host yet"
            description="Create a Host profile to publish and manage events."
            action={<Button asChild><Link to="/host/register">Become a Host</Link></Button>}
          />
        </div>
      </div>
    );
  }

  const renderList = (rows: EventRow[]) => {
    if (loading) return <div className="text-muted-foreground">Loading…</div>;
    if (rows.length === 0) {
      return <EmptyState icon={Calendar} title="No events here" description="Create your first event to get started." action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Event</Button>} />;
    }
    return (
      <ul className="space-y-3">
        {rows.map((e) => {
          const c = rsvpCounts[e.id] ?? { confirmed: 0, waitlist: 0, checked_in: 0 };
          const hasRsvps = c.confirmed + c.waitlist > 0;
          return (
            <li key={e.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-14 w-20 shrink-0 rounded bg-secondary bg-cover bg-center" style={{ backgroundImage: e.cover_url ? `url(${e.cover_url})` : "var(--gradient-primary)" }} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{e.title}</h3>
                      <Badge variant={e.status === "published" ? "default" : "secondary"}>{e.status}</Badge>
                      {e.visibility === "unlisted" && <Badge variant="outline">Unlisted</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(e.starts_at), "MMM d, p")} · {e.time_zone}
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span><b className="text-foreground">{c.confirmed}</b> Going</span>
                      <span><b className="text-foreground">{c.waitlist}</b> Waitlist</span>
                      <span><b className="text-foreground">{c.checked_in}</b> Checked-in</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild><Link to={`/events/${e.slug}`}><Eye className="mr-1.5 h-4 w-4" />View</Link></Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(e)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => onPublishToggle(e)}>
                    {e.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDuplicate(e)}><Copy className="mr-1.5 h-4 w-4" />Duplicate</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.info("Check-in coming soon")}><ScanLine className="mr-1.5 h-4 w-4" />Check-in</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.info("CSV export coming soon")}><Download className="mr-1.5 h-4 w-4" />CSV</Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => tryDelete(e)} title={hasRsvps ? "Has RSVPs — unpublish instead" : "Delete"}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="container py-10">
      <PageHeader
        title="Host Dashboard"
        description="Manage your events, RSVPs, and check-ins."
        actions={
          <div className="flex items-center gap-2">
            {managerHosts.length > 1 && (
              <Select value={hostId} onValueChange={setHostId}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {managerHosts.map((m) => (
                    <SelectItem key={m.host_id} value={m.host_id}>{m.hosts?.name ?? m.host_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Event</Button>
          </div>
        }
      />

      <Tabs defaultValue="upcoming" className="mt-8">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6">{renderList(upcoming)}</TabsContent>
        <TabsContent value="past" className="mt-6">{renderList(past)}</TabsContent>
      </Tabs>

      {hostId && (
        <EventForm open={formOpen} onOpenChange={setFormOpen} hostId={hostId} initial={editing} onSaved={load} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
