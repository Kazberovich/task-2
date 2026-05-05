import { Outlet } from "react-router-dom";
import { MainNav } from "./MainNav";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MainNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <div className="container">© {new Date().getFullYear()} Gather — Free community events</div>
      </footer>
    </div>
  );
}