import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-6 sm:gap-8",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "font-serif text-base font-medium tracking-tight",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-8 w-8 inline-flex items-center justify-center rounded-full bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "text-muted-foreground w-10 font-medium text-[0.7rem] uppercase tracking-[0.12em]",
        row: "flex w-full mt-1.5",
        cell: cn(
          "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
          // range middle background — connects pills via secondary fill
          "[&:has([aria-selected].day-range-middle)]:bg-secondary",
          // range start: round left, accent bg
          "[&:has(.day-range-start)]:bg-secondary [&:has(.day-range-start)]:rounded-l-full",
          // range end: round right
          "[&:has(.day-range-end)]:bg-secondary [&:has(.day-range-end)]:rounded-r-full",
        ),
        day: cn(
          "h-10 w-10 p-0 font-normal rounded-full inline-flex items-center justify-center transition-colors",
          "hover:bg-secondary hover:text-foreground aria-selected:opacity-100",
        ),
        day_range_start: "day-range-start bg-foreground text-background hover:bg-foreground hover:text-background",
        day_range_end: "day-range-end bg-foreground text-background hover:bg-foreground hover:text-background",
        day_selected:
          "bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background",
        day_today:
          "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-accent",
        day_outside:
          "day-outside text-muted-foreground/50 aria-selected:bg-secondary aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground/40",
        day_range_middle:
          "rounded-none bg-transparent text-foreground hover:bg-secondary aria-selected:bg-transparent aria-selected:text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
