import { Outlet } from "react-router-dom";
import { MainNav } from "./MainNav";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MainNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-border py-8 text-sm text-muted-foreground">
        <div className="container flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-lg font-semibold text-foreground">Gather</span>
            <span className="font-serif text-lg leading-none text-accent">.</span>
          </div>
          <div>© {new Date().getFullYear()} Free community events for everyone.</div>
        </div>
      </footer>
    </div>
  );
}