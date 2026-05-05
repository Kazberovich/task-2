# Building Brighten Events — A Build Report

_From my point of view, after spending a good chunk of time building this event platform with Lovable._

## What I set out to build

An events platform with the usual suspects: hosts publishing events, attendees RSVPing, a waitlist when things fill up, ticket QR codes, a check-in flow for door staff, post-event feedback, a photo gallery with moderation, and a host dashboard with CSV exports. Nothing exotic, but enough moving parts that the details matter.

## Tools and techniques

- **Lovable** as the main driver — I described features in plain English and iterated on the output instead of hand-writing every file.
- **React 18 + Vite + TypeScript** for the frontend, **Tailwind** with a semantic token system in `index.css` for styling, and **shadcn/ui** components as the base layer.
- **Lovable Cloud** (Supabase under the hood) for auth, Postgres, RLS, storage, and edge-style logic. I leaned on **RLS policies** and a separate `user_roles` table instead of stuffing roles on profiles.
- **`has_role()` security-definer function** to keep RLS policies non-recursive — this saved me from a whole class of headaches.
- **Database triggers** for things like waitlist promotion when a confirmed RSVP cancels, and for blocking duplicate check-ins.
- **date-fns** for time formatting, **sonner** for toasts, and a small **CSV builder** with proper quote/comma escaping plus a UTF-8 BOM so Excel stops mangling accented names.
- **Magazine-style redesign** late in the project: serif display font (Fraunces) for headings, generous whitespace, pill-shaped date range picker, editorial event cards.

## What worked well

- **Describing features in chunks.** Splitting the build into "auth + hosts", then "RSVP + waitlist", then "check-in", then "feedback + gallery + moderation", then "polish + CSV" kept each step reviewable. Trying to one-shot the whole thing would have been a mess.
- **Letting Lovable handle Supabase types and the client.** I never touched `types.ts` or `client.ts` and everything stayed in sync.
- **Roles in a separate table from day one.** When I added the moderation queue and checker role later, the permission model just slotted in — no painful migration.
- **RLS-first thinking.** Writing the policies up front meant the UI didn't have to babysit access checks. The DB said no, the UI showed an empty state.
- **The visual redesign.** Pointing at a Dribbble reference and asking for a magazine aesthetic worked surprisingly well. The site went from "generic shadcn dashboard" to something I'd actually want to share.
- **CSV export.** Got this right on the first try: proper escaping, BOM for Excel, sensible filename like `event-title-rsvps-2026-05-05.csv`.

## What didn't work (or took multiple tries)

- **Waitlist promotion logic.** The first version promoted someone the instant a cancel happened but didn't notify them or update the UI in real time. I had to go back and add the trigger + a clearer state on the attendee's ticket.
- **Duplicate check-in protection.** My first attempt only checked client-side. Obvious in hindsight — I moved it to a DB constraint plus a friendly error toast.
- **Date range picker.** The default shadcn calendar looked nothing like the rest of the redesigned site. Took a focused round of work on `calendar.tsx` and `popover.tsx` to get the pill-shaped range, serif month label, and the little "today" dot.
- **Empty states.** I kept forgetting them on first pass and the app felt broken when a host had zero events or an attendee had no tickets. Had to do a sweep specifically for empty/error/loading states.
- **Gallery moderation flow.** Initial version let photos go public immediately. Reworked so uploads sit in a pending queue and only appear after host approval, with a separate "report" path for already-public items.
- **QR scanning.** I asked where the camera scanner was, then realized the original spec said manual code entry was sufficient. Tickets show a QR for attendees, but check-in is type-the-code. Decided not to add a scanner — would do it later if a real venue asked.

## Notable decisions

- **Lovable Cloud over rolling my own backend.** Zero infra setup, auth and storage out of the box, and I never had to leave the editor to manage a database.
- **No anonymous auth, no auto-confirm.** Standard email/password (plus Google) with email verification — it's an event platform, identity matters at the door.
- **Hide instead of delete for moderation.** Reported photos and events get hidden from public views but stay visible to the host. Easier to recover from a bad report and keeps an audit trail.
- **Unpublish-not-delete for events with RSVPs.** Deleting an event with attendees would silently drop their tickets. Blocking the delete and offering "Unpublish" instead felt much safer.
- **Roles: `owner`, `manager`, `checker`.** Three is enough. Owners do everything, managers run events, checkers only see the door scanner. Moderation tools are gated to owner/manager — checkers can't touch them.
- **Semantic Tailwind tokens everywhere.** No raw `bg-white` / `text-black` in components. Made the late visual redesign painless — I changed tokens in `index.css` and the whole app shifted.
- **One feedback per user per event, after the event ends.** Enforced in the DB, not just the UI. Comments are optional; ratings are required.

## Things I'd do next

- Add real camera-based QR scanning for check-in.
- Email notifications for waitlist promotions and event reminders.
- Calendar (.ics) attachment in the RSVP confirmation, not just on the event page.
- A proper analytics view for hosts: views → RSVPs → check-ins funnel.

## Overall

The mix of "describe it in English, then refine" with a strict design system and RLS-first backend turned out to be a productive way to work. The parts that hurt were the parts I tried to skip — empty states, server-side validation, and visual consistency. Once I stopped skipping them, the app actually felt finished.