import { Ticket } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";

export default function MyTickets() {
  return (
    <div className="container py-10">
      <PageHeader title="My Tickets" description="Your upcoming and past event tickets." />
      <div className="mt-8">
        <EmptyState icon={Ticket} title="No tickets yet" description="When you RSVP to an event, your digital ticket will appear here." />
      </div>
    </div>
  );
}
