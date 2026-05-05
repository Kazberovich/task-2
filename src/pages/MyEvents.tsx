import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";

export default function MyEvents() {
  return (
    <div className="container py-10">
      <PageHeader title="My Events" description="Events you've RSVP'd to or are on the waitlist for." />
      <div className="mt-8">
        <EmptyState icon={Calendar} title="Nothing on your calendar" description="Browse Explore and RSVP to start collecting events here." />
      </div>
    </div>
  );
}
