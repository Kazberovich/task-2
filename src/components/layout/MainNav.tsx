import { Link, NavLink, useNavigate } from "react-router-dom";
import { Calendar, Compass, LayoutDashboard, LogOut, Menu, Ticket, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

const linkBase =
  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-foreground";
const active = "bg-foreground text-background hover:text-background";
const inactive = "text-muted-foreground";

export function MainNav() {
  const { user, isHost, isChecker, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = [
    { to: "/", label: "Explore", icon: Compass, show: true },
    { to: "/my/tickets", label: "My Tickets", icon: Ticket, show: !!user },
    { to: "/my/events", label: "My Events", icon: Calendar, show: !!user && (isHost || isChecker) },
    { to: "/dashboard", label: "Host Dashboard", icon: LayoutDashboard, show: isHost },
  ].filter((i) => i.show);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navLinks = (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={() => setOpen(false)}
          className={({ isActive }) => cn(linkBase, isActive ? active : inactive)}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full bg-background/70 backdrop-blur-md">
      <div className="container flex h-20 items-center justify-between gap-4">
        <Link to="/" className="flex items-baseline gap-1">
          <span className="font-serif text-2xl font-semibold tracking-tight">Gather</span>
          <span className="font-serif text-2xl text-accent leading-none">.</span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-border bg-card/60 p-1 md:flex">
          {navLinks}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full border-border">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!isHost && (
                  <DropdownMenuItem onClick={() => navigate("/host/register")}>
                    Become a Host
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate("/auth")} size="sm" className="rounded-full px-5">
              Sign In
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-8 flex flex-col gap-1">{navLinks}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}