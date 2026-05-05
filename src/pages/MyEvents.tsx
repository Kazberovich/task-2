import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar as CalendarIcon, Download, Eye, Pencil, ScanLine, Search } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { buildAttendeesCsv } from "@/lib/csv";

interface EventRow {
  id: string; slug: string; title: string; starts_at: string; ends_at: string;
  status: string; host_id: string; hosts: { name: string; slug: string } | null;
}

export default function MyEvents() {
  const { user, hostMemberships } = useAuth();
  const roleByHost = useMemo(() => {
    const m = new Map<string, "owner" | "manager" | "checker">();
    hostMemberships.forEach((h) => m.set(h.host_id, h.role));
    return m;
  }, [hostMemberships]);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostFilter, setHostFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRange | undefined>();

  useEffect(() => {
    if (!user) return;
    const hostIds = hostMemberships.map((h) => h.host_id);
    if (hostIds.length === 0) { setEvents([]); setLoading(false); return; }
    setLoading(true);
    supabase.from("events")
      .select("id, slug, title, starts_at, ends_at, status, host_id, hosts(name, slug)")
      .in("host_id", hostIds)
      .order("starts_at", { ascending: false })
      .then(({ data }) => { setEvents((data as any) ?? []); setLoading(false); });
  }, [user?.id, hostMemberships.length]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return events.filter((e) => {
      if (hostFilter !== "all" && e.host_id !== hostFilter) return false;
      if (s && !`${e.title} ${e.hosts?.name ?? ""}`.toLowerCase().includes(s)) return false;
      if (range?.from && new Date(e.starts_at) < range.from) return false;
      if (range?.to && new Date(e.starts_at) > range.to) return false;
      return true;
    });
  }, [events, hostFilter, search, range]);

  const exportCsv = async (e: EventRow) => {
    const csv = await buildAttendeesCsv(e.id);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${e.slug}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  if (hostMemberships.length === 0) {
    return (
      <div className="container py-10">
        <PageHeader title="My Events" description="Events you help run as a Host or Checker." />
        <div className="mt-8">
          <EmptyState
            icon={CalendarIcon}
            title="You don't help run any events yet"
            description="Become a Host or accept an invite to manage or check in attendees."
            action={<Button asChild><Link to="/host/register">Become a Host</Link></Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <PageHeader title="My Events" description="Events you help run as a Host or Checker." />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or host" className="pl-9" />
        </div>
        <Select value={hostFilter} onValueChange={setHostFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All hosts</SelectItem>
            {hostMemberships.map((h) => (
              <SelectItem key={h.host_id} value={h.host_id}>{h.hosts?.name ?? h.host_id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {range?.from ? `${format(range.from, "MMM d")}${range.to ? " – " + format(range.to, "MMM d") : ""}` : "Date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-2">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {range && <Button variant="ghost" size="sm" onClick={() => setRange(undefined)}>Clear dates</Button>}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CalendarIcon} title="No events match" description="Try clearing filters." />
        ) : (
          <ul className="space-y-3">
            {filtered.map((e) => {
              const role = roleByHost.get(e.host_id);
              const isHost = role === "owner" || role === "manager";
              const ended = new Date(e.ends_at) < new Date();
              return (
                <li key={e.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{e.title}</h3>
                        <Badge variant={isHost ? "default" : "outline"}>{isHost ? "Host" : "Checker"}</Badge>
                        {ended && <Badge variant="secondary">Ended</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {e.hosts?.name} · {format(new Date(e.starts_at), "MMM d, yyyy · p")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isHost && (
                        <>
                          <Button size="sm" variant="outline" asChild><Link to={`/events/${e.slug}`}><Eye className="mr-1 h-3 w-3" />View</Link></Button>
                          <Button size="sm" variant="outline" asChild><Link to="/dashboard"><Pencil className="mr-1 h-3 w-3" />Manage</Link></Button>
                        </>
                      )}
                      <Button size="sm" asChild>
                        <Link to={`/check-in/${e.id}`}><ScanLine className="mr-1 h-3 w-3" />Check-in</Link>
                      </Button>
                      {isHost && (
                        <Button size="sm" variant="ghost" onClick={() => exportCsv(e)}>
                          <Download className="mr-1 h-3 w-3" />CSV
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
