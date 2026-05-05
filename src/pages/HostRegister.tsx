import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

export default function HostRegister() {
  const navigate = useNavigate();
  return (
    <div className="container py-10">
      <PageHeader title="Become a Host" description="Create a Host profile to publish events and welcome attendees." />
      <div className="mt-8">
        <EmptyState
          icon={Sparkles}
          title="Host registration coming up next"
          description="The self-serve Host onboarding flow will live here. You'll pick a slug, name, bio, and avatar."
          action={<Button variant="outline" onClick={() => navigate("/")}>Back to Explore</Button>}
        />
      </div>
    </div>
  );
}
