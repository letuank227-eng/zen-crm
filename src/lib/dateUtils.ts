export type DatePeriod = 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM';

export interface DateRangeResult {
  period: DatePeriod;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  label: string;    // E.g. "Hôm nay (25/09/2026)", "Tuần này (21/09 - 27/09/2026)"
  formattedRange: string; // E.g. "25/09/2026" or "21/09 - 27/09/2026"
}

export function parseDateBoundary(dateStr: string, isEndOfDay = false): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (isEndOfDay) {
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function getDateRange(
  period: DatePeriod,
  customFrom?: string,
  customTo?: string,
  refDate: Date = new Date()
): DateRangeResult {
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const formatDMY = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

  let start: Date | null = null;
  let end: Date | null = null;

  switch (period) {
    case 'DAY': {
      start = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);
      end = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 23, 59, 59, 999);
      return {
        period,
        dateFrom: formatYMD(start),
        dateTo: formatYMD(end),
        label: `Hôm nay (${formatDMY(start)})`,
        formattedRange: formatDMY(start),
      };
    }
    case 'WEEK': {
      const day = refDate.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      start = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + diffToMonday, 0, 0, 0, 0);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      return {
        period,
        dateFrom: formatYMD(start),
        dateTo: formatYMD(end),
        label: `Tuần này (${pad(start.getDate())}/${pad(start.getMonth() + 1)} - ${formatDMY(end)})`,
        formattedRange: `${pad(start.getDate())}/${pad(start.getMonth() + 1)} - ${formatDMY(end)}`,
      };
    }
    case 'MONTH': {
      start = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);
      return {
        period,
        dateFrom: formatYMD(start),
        dateTo: formatYMD(end),
        label: `Tháng này (Tháng ${refDate.getMonth() + 1}/${refDate.getFullYear()})`,
        formattedRange: `01/${pad(refDate.getMonth() + 1)} - ${formatDMY(end)}`,
      };
    }
    case 'QUARTER': {
      const q = Math.floor(refDate.getMonth() / 3);
      start = new Date(refDate.getFullYear(), q * 3, 1, 0, 0, 0, 0);
      end = new Date(refDate.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);
      return {
        period,
        dateFrom: formatYMD(start),
        dateTo: formatYMD(end),
        label: `Quý này (Quý ${q + 1}/${refDate.getFullYear()})`,
        formattedRange: `${formatDMY(start)} - ${formatDMY(end)}`,
      };
    }
    case 'YEAR': {
      start = new Date(refDate.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(refDate.getFullYear(), 11, 31, 23, 59, 59, 999);
      return {
        period,
        dateFrom: formatYMD(start),
        dateTo: formatYMD(end),
        label: `Năm nay (Năm ${refDate.getFullYear()})`,
        formattedRange: `Năm ${refDate.getFullYear()}`,
      };
    }
    case 'CUSTOM': {
      let formattedRange = 'Tùy chọn';
      if (customFrom && customTo) {
        formattedRange = `${customFrom} đến ${customTo}`;
      } else if (customFrom) {
        formattedRange = `Từ ${customFrom}`;
      } else if (customTo) {
        formattedRange = `Đến ${customTo}`;
      }
      return {
        period,
        dateFrom: customFrom || '',
        dateTo: customTo || '',
        label: 'Tùy chọn thời gian',
        formattedRange,
      };
    }
    default: {
      return {
        period: 'ALL',
        dateFrom: '',
        dateTo: '',
        label: 'Toàn bộ thời gian',
        formattedRange: 'Tất cả dữ liệu',
      };
    }
  }
}
