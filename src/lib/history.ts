import { isToday, isYesterday, format, isSameYear } from "date-fns";

export interface JournalEntry {
  id: string;
  title: string;
  createdAt: Date;
}

export interface GroupedHistory {
  [year: string]: {
    [month: string]: {
      [dayLabel: string]: JournalEntry[];
    };
  };
}

export function groupEntries(entries: JournalEntry[]) {
  // Sort entries descending
  const sorted = [...entries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  const grouped: GroupedHistory = {};
  
  // Find out if all entries are from the same year
  const allSameYear = sorted.length > 0 && sorted.every(e => isSameYear(e.createdAt, sorted[0].createdAt));

  sorted.forEach((entry) => {
    const yearStr = format(entry.createdAt, "yyyy");
    const monthStr = format(entry.createdAt, "MMMM");
    
    let dayLabel = format(entry.createdAt, "MMMM d");
    if (isToday(entry.createdAt)) {
      dayLabel = "Today";
    } else if (isYesterday(entry.createdAt)) {
      dayLabel = "Yesterday";
    }

    // If all entries are in the same year, we use a dummy "CURRENT_YEAR" key
    // so we know not to render the year header.
    const yearKey = allSameYear ? "CURRENT_YEAR" : yearStr;

    if (!grouped[yearKey]) grouped[yearKey] = {};
    if (!grouped[yearKey][monthStr]) grouped[yearKey][monthStr] = {};
    if (!grouped[yearKey][monthStr][dayLabel]) grouped[yearKey][monthStr][dayLabel] = [];

    grouped[yearKey][monthStr][dayLabel].push(entry);
  });

  return grouped;
}
