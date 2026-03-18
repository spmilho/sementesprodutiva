const DAY_MS = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isValidDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day, 12, 0, 0);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function fromExcelSerial(serial: number) {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const millis = excelEpoch + Math.round(serial) * DAY_MS;
  const date = new Date(millis);

  if (Number.isNaN(date.getTime())) return null;

  return toIsoDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

export function parseSpreadsheetDate(value: unknown): string | null {
  if (value == null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 1 && value < 100000) {
    return fromExcelSerial(value);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return isValidDateParts(year, month, day) ? toIsoDate(year, month, day) : null;
  }

  const slashMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const yearToken = slashMatch[3];
    const year = yearToken ? (yearToken.length === 2 ? 2000 + Number(yearToken) : Number(yearToken)) : new Date().getFullYear();

    if (isValidDateParts(year, second, first)) {
      return toIsoDate(year, second, first);
    }

    if (isValidDateParts(year, first, second)) {
      return toIsoDate(year, first, second);
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return toIsoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }

  return null;
}

function swapDayMonth(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month > 12 || day > 12) return null;
  if (!isValidDateParts(year, day, month)) return null;

  return toIsoDate(year, day, month);
}

function toTimestamp(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).getTime();
}

function nearestGapDays(target: string, others: string[]) {
  if (others.length === 0) return Number.POSITIVE_INFINITY;
  const targetTs = toTimestamp(target);
  return Math.min(...others.map((value) => Math.abs(toTimestamp(value) - targetTs) / DAY_MS));
}

export function repairAmbiguousIsoRecordDates<T extends { record_date: string }>(records: T[]): T[] {
  const normalized = records.map((record) => parseSpreadsheetDate(record.record_date) ?? record.record_date);

  return records.map((record, index) => {
    const current = normalized[index];
    const swapped = swapDayMonth(current);

    if (!swapped || swapped === current) return { ...record, record_date: current };

    const others = normalized.filter((_, otherIndex) => otherIndex !== index);
    const currentGap = nearestGapDays(current, others);
    const swappedGap = nearestGapDays(swapped, others);

    const repairedDate = swappedGap + 1 < currentGap ? swapped : current;
    return { ...record, record_date: repairedDate };
  });
}
