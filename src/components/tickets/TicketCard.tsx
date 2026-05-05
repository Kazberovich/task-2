import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { format } from "date-fns";
import { Calendar, MapPin, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildIcs, downloadIcs } from "@/lib/ics";

export interface TicketCardData {
  id: string;
  code: string;
  status: "valid" | "cancelled";
  rsvp_status: "confirmed" | "waitlisted" | "cancelled";
  attendee_name: string;
  attendee_email: string;
  event: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    location: string | null;
    online_url: string | null;
    description: string | null;
    host_name: string;
  };
}

interface Props {
  ticket: TicketCardData;
  onCancel?: () => void;
  cancelling?: boolean;
}

export function TicketCard({ ticket, onCancel, cancelling }: Props) {
  const [qr, setQr] = useState<string>("");
  const waitlisted = ticket.rsvp_status === "waitlisted";
  const ended = new Date(ticket.event.ends_at) < new Date();

  useEffect(() => {
    if (waitlisted) return;
    QRCode.toDataURL(ticket.code, { width: 220, margin: 1 }).then(setQr).catch(() => {});
  }, [ticket.code, waitlisted]);

  const handleIcs = () => {
    const ics = buildIcs({
      uid: ticket.id,
      title: ticket.event.title,
      description: ticket.event.description,
      location: ticket.event.location ?? ticket.event.online_url ?? "",
      start: new Date(ticket.event.starts_at),
      end: new Date(ticket.event.ends_at),
    });
    downloadIcs(ticket.event.title.replace(/\s+/g, "-"), ics);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {waitlisted ? (
              <Badge variant="secondary">Waitlisted</Badge>
            ) : (
              <Badge>Going</Badge>
            )}
            {ended && <Badge variant="outline">Ended</Badge>}
          </div>
          <h3 className="mt-2 text-lg font-semibold leading-tight">{ticket.event.title}</h3>
          <p className="text-sm text-muted-foreground">Hosted by {ticket.event.host_name}</p>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(new Date(ticket.event.starts_at), "EEE, MMM d, yyyy · p")}
            </div>
            {(ticket.event.location || ticket.event.online_url) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{ticket.event.location ?? "Online event"}</span>
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {ticket.attendee_name} · {ticket.attendee_email}
          </div>
          {!waitlisted && (
            <div className="mt-2 font-mono text-xs tracking-widest">CODE: {ticket.code}</div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {!waitlisted && !ended && (
              <Button size="sm" variant="outline" onClick={handleIcs}>
                <Download className="mr-1 h-3 w-3" /> Add to calendar
              </Button>
            )}
            {onCancel && !ended && (
              <Button size="sm" variant="ghost" onClick={onCancel} disabled={cancelling}>
                <X className="mr-1 h-3 w-3" /> {waitlisted ? "Leave waitlist" : "Cancel RSVP"}
              </Button>
            )}
          </div>
        </div>
        {!waitlisted && qr && (
          <div className="shrink-0 rounded-lg border border-border bg-background p-2">
            <img src={qr} alt="Ticket QR" className="h-32 w-32" />
          </div>
        )}
      </div>
    </div>
  );
}