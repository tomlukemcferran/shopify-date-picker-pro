/**
 * Blackout dates: load and check if a date is blacked out.
 * Supports one-off dates and recurring annual (e.g. Dec 25).
 */
import prisma from "~/db.server";

export async function getBlackoutDates(shop: string): Promise<{ date: string; recurring: boolean }[]> {
  const rows = await prisma.blackoutDate.findMany({
    where: { shop },
    select: { date: true, recurring: true },
  });
  return rows;
}

/** Check if YYYY-MM-DD is blacked out (includes recurring by month-day). */
export function isDateBlackedOut(
  dateStr: string,
  blackouts: { date: string; recurring: boolean }[]
): boolean {
  const parts = dateStr.split("-");
  const monthDay = parts.length >= 3
    ? `${parts[1]!}-${parts[2]!}`
    : dateStr;

  for (const b of blackouts) {
    if (b.recurring) {
      // Stored as "MM-DD" or "YYYY-MM-DD"; compare month-day
      const bParts = b.date.split("-");
      const bMonthDay = bParts.length >= 3 ? `${bParts[1]!}-${bParts[2]!}` : b.date;
      if (bMonthDay === monthDay) return true;
    } else {
      if (b.date === dateStr) return true;
    }
  }
  return false;
}

export async function addBlackout(
  shop: string,
  date: string,
  options: { recurring?: boolean; label?: string }
): Promise<void> {
  await prisma.blackoutDate.create({
    data: {
      shop,
      date,
      recurring: options.recurring ?? false,
      label: options.label ?? null,
    },
  });
}

export async function removeBlackout(shop: string, id: string): Promise<void> {
  await prisma.blackoutDate.deleteMany({ where: { shop, id } });
}
