import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function HostDashboard() {
  const { hostMemberships } = useAuth();
  return (
    <div className="container py-10">
      <PageHeader
        title="Host Dashboard"
        description="Manage your events, RSVPs, attendance, gallery, and reports."
        actions={<Button disabled>New Event</Button>}
      />
      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Your hosts</h2>
          {hostMemberships.length === 0 ? (
            <p className="mt-2 text-sm">You aren't part of a host yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {hostMemberships.map((m) => (
                <li key={m.host_id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="font-medium">{m.hosts?.name ?? m.host_id}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{m.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <EmptyState
          icon={LayoutDashboard}
          title="Dashboard tools are on the way"
          description="Event editor, RSVP management, check-in, gallery moderation, CSV exports, and reports queue will be added in upcoming iterations."
        />
      </div>
    </div>
  );
}
