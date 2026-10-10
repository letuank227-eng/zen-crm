import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export * from './dateUtils';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDurationSeconds(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 phút';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  }
  return `${Math.max(1, minutes)} phút`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getDaysDifference(dateString?: string): number {
  if (!dateString) return 0;
  const target = new Date(dateString).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - target) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function isStale(dateString?: string, thresholdDays: number = 7): boolean {
  if (!dateString) return false;
  return getDaysDifference(dateString) >= thresholdDays;
}

export function generateId(prefix: string = 'id'): string {
  const rand = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${rand}`;
}

/**
 * Ẩn họ và tên lót của nhân sự Sale khi hiển thị cho Sale xem (chỉ giữ lại Tên gọi).
 * Ví dụ: "Nguyễn Văn Nam" -> "******** Nam", "Lê Quốc Tuấn" -> "******** Tuấn", "Trần Thị Mai" -> "******** Mai".
 */
export function maskSaleName(fullName?: string): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return parts[0];
  const givenName = parts[parts.length - 1]; // Trong văn hóa tên tiếng Việt, từ cuối cùng là tên chính
  return `******** ${givenName}`;
}

/**
 * Kiểm tra xem người dùng hiện tại có được phép xem số điện thoại khách hàng hay không.
 * - Giám đốc (ADMIN) và Quản lý (LEADER): Được xem toàn bộ SĐT trên hệ thống.
 * - Sale (SALE): Chỉ được xem SĐT khách hàng do chính mình phụ trách ("sale nào xem của sale đó").
 * - Trường hợp khác (khách chưa phân công, khách của sale khác): Bị ẩn/che số trên hệ thống.
 */
export function canViewCustomerPhone(
  currentUser?: { id?: string; role?: string } | null,
  assignedSaleId?: string | null
): boolean {
  if (!currentUser) return false;
  // Giám đốc (ADMIN) và Quản lý (LEADER) có toàn quyền xem SĐT trên toàn hệ thống
  if (currentUser.role === 'ADMIN' || currentUser.role === 'LEADER') {
    return true;
  }
  // Sale chỉ được xem SĐT của khách hàng do chính mình phụ trách
  if (currentUser.role === 'SALE' && assignedSaleId && currentUser.id && assignedSaleId === currentUser.id) {
    return true;
  }
  return false;
}

/**
 * Kiểm tra xem người dùng hiện tại có được phép xem thông tin cá nhân (SĐT, Địa chỉ, Email, Ngày sinh, Công ty) của khách hàng hay không.
 * - Giám đốc (ADMIN) và Quản lý (LEADER): Xem đầy đủ 100%.
 * - Sale (SALE): Chỉ xem đầy đủ đối với khách của mình. Khách của bạn sale khác sẽ bị ẩn SĐT, địa chỉ và thông tin cá nhân (chỉ xem được Tên, mua chậu nào, tên bạn sale phụ trách, ngày tạo).
 */
export function canViewCustomerPersonalInfo(
  currentUser?: { id?: string; role?: string } | null,
  assignedSaleId?: string | null
): boolean {
  return canViewCustomerPhone(currentUser, assignedSaleId);
}

/**
 * Che số điện thoại bảo mật trên hệ thống.
 * Ví dụ: "0987654321" -> "098****321" hoặc "0912456789" -> "091****789"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length < 7) return '********';
  const prefix = clean.slice(0, 3);
  const suffix = clean.slice(-3);
  return `${prefix}****${suffix}`;
}

/**
 * Tự động tạo mật khẩu gồm các ký tự chữ và số (chữ hoa, chữ thường và chữ số).
 * Loại bỏ các ký tự dễ nhầm lẫn như 0, O, 1, l.
 */
export function generateRandomPassword(length: number = 8): string {
  const letters = 'abcdefghkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const all = letters + numbers;

  let pass = '';
  // Đảm bảo có ít nhất chữ và số
  pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pass += letters.charAt(Math.floor(Math.random() * letters.length));
  pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pass += letters.charAt(Math.floor(Math.random() * letters.length));

  for (let i = pass.length; i < length; i++) {
    pass += all.charAt(Math.floor(Math.random() * all.length));
  }

  // Trộn ngẫu nhiên các ký tự
  return pass
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
}

/**
 * Hàm sao chép nội dung vào Clipboard an toàn, hỗ trợ cả HTTP/LAN và HTTPS
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    } catch (err) {
      console.error('Fallback copy failed', err);
      return false;
    }
  }
  return false;
}

/**
 * Nén và resize ảnh client-side bằng HTML5 Canvas trước khi lưu vào DB.
 * Giảm 95-98% dung lượng dữ liệu (từ vài MB xuống vài chục KB), bảo vệ DB Turso không bị phình to.
 */
export async function compressImageFile(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Chỉ hỗ trợ nén ảnh trên môi trường trình duyệt'));
    }
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
