# Brighten Events — Usage Guide

A step-by-step walkthrough of the four main flows: **Publish → RSVP → Ticket → Check-in**.

This is a usage guide for people actually using the app. For the build retrospective, see [`report.md`](./report.md).

---

## Roles at a glance

- **Attendee** — anyone signed in. Can RSVP, get tickets, leave feedback, upload gallery photos.
- **Host** — owns or manages a Host profile. Can create/publish events and moderate.
- **Checker** — invited by a host to staff the door. Can only access the check-in screen.

You become a Host by visiting **Become a Host** from the nav and registering a host profile. You can invite Managers and Checkers from the **Members** tab in the Host Dashboard.

---

## 1. Publish an event (Host)

1. Sign in and open **Host Dashboard**.
2. If you manage more than one host, pick the host from the dropdown in the top right.
3. Click **Create Event**.
4. Fill in the form:
   - **Title, description, cover image**
   - **Start / end date and time** plus the event time zone
   - **Location** (physical address) **or Online URL**
   - **Capacity** — leave blank for unlimited; set a number to enable the waitlist
   - **Visibility** — `Public` shows in Explore; `Unlisted` is share-by-link only
5. Save as **Draft** to keep iterating, or set status to **Published** to go live.
6. Back on the dashboard, the event appears under **Upcoming** with badges for status and visibility.

You can **Edit**, **Duplicate** (creates a draft copy), **Unpublish**, or **Delete** an event from the row actions. Events with existing RSVPs cannot be deleted — unpublish them instead.

---

## 2. RSVP to an event (Attendee)

1. Browse **Explore** or open a direct event link.
2. On the event page, click **RSVP**.
   - If you're signed out, you'll be sent to sign in and returned to the same event.
3. What happens next depends on capacity:
   - **Spot available** → you're **Confirmed** and a ticket is generated immediately.
   - **Event is full** → you're added to the **Waitlist** in arrival order.
4. You can **Cancel** at any time from the event page or from **My Tickets**.
   - When a confirmed attendee cancels, the next person on the waitlist is automatically promoted to Confirmed.

The event page always shows the live counts (Going / Waitlist) and your current status.

---

## 3. Your ticket (Attendee)

1. Open **My Tickets** from the nav.
2. Each confirmed RSVP shows a ticket card with:
   - Event title, date, time zone, and location
   - A **QR code** and the **ticket code** printed underneath
   - Status: `Confirmed`, `Waitlisted`, or `Checked-in`
3. Bring the QR code or the printed code to the door. Either works — the checker can scan or type.
4. After the event ends:
   - The ticket flips to a past state.
   - A **Leave feedback** action appears (1–5 stars, optional comment, one submission per event).

You can also download an `.ics` calendar file from the event page to add it to your calendar.

---

## 4. Check-in at the door (Host or Checker)

1. From the **Host Dashboard**, click **Check-in** on the event row. Checkers go to the same screen via their assigned events.
2. Type or paste the attendee's **ticket code** into the input.
3. Press **Check in**.
   - ✅ Valid code → attendee is marked checked-in, a success toast confirms, and the dashboard counter increments.
   - ⚠️ Already used → a duplicate-check-in error is shown; nothing changes.
   - ❌ Unknown code or wrong event → an error toast explains why.
4. To undo a mistake, find the attendee in the recent check-ins list and click **Undo**.

Check-ins are enforced server-side: the same ticket cannot be checked in twice, and codes only work for their own event.

---

## After the event

- **Feedback** — attendees who actually RSVP'd see the feedback form once the event has ended. Average rating and count appear on the past event page.
- **Gallery** — anyone who attended can upload photos. Uploads are **pending** until the host approves them in the **Moderation** tab. Approved photos appear in the public gallery.
- **Reports** — any user can report an event or a photo. Reports land in the host's **Moderation** queue, where the host can mark them reviewed or hide the offending item. Hidden items disappear from public views but remain visible to the host.
- **CSV export** — from the dashboard row, click **CSV** to download a clean attendee export (`event-title-rsvps-YYYY-MM-DD.csv`) with name, email, RSVP status, and check-in time. It opens correctly in Excel and Google Sheets.

---

## Quick reference

| You want to… | Go to |
|---|---|
| Find an event | **Explore** |
| See your upcoming events | **My Events** |
| See your tickets | **My Tickets** |
| Create or manage events | **Host Dashboard** |
| Run the door | **Check-in** (from a dashboard row) |
| Approve photos / handle reports | **Host Dashboard → Moderation** |
| Invite managers or checkers | **Host Dashboard → Members** |

---

## Tech

Built with React + Vite + TypeScript, Tailwind, shadcn/ui, and Lovable Cloud (auth, Postgres with RLS, storage). See `report.md` for the build retrospective.
