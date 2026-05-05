import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import Explore from "./pages/Explore";
import EventDetail from "./pages/EventDetail";
import HostPage from "./pages/HostPage";
import HostRegister from "./pages/HostRegister";
import MyTickets from "./pages/MyTickets";
import MyEvents from "./pages/MyEvents";
import HostDashboard from "./pages/HostDashboard";
import Auth from "./pages/Auth";
import InviteAccept from "./pages/InviteAccept";
import CheckIn from "./pages/CheckIn";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Explore />} />
              <Route path="/events/:slug" element={<EventDetail />} />
              <Route path="/hosts/:slug" element={<HostPage />} />
              <Route path="/host/register" element={<RequireAuth><HostRegister /></RequireAuth>} />
              <Route path="/my/tickets" element={<RequireAuth><MyTickets /></RequireAuth>} />
              <Route path="/my/events" element={<RequireAuth><MyEvents /></RequireAuth>} />
              <Route path="/dashboard" element={<RequireAuth requireHost><HostDashboard /></RequireAuth>} />
              <Route path="/invite/:token" element={<RequireAuth><InviteAccept /></RequireAuth>} />
              <Route path="/check-in/:eventId" element={<RequireAuth requireChecker><CheckIn /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
