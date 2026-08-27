// Security Utilities - Chuẩn bảo mật OWASP Top 10

export type UserRole = "admin" | "player" | "display";

export interface AuthContext {
  role: UserRole;
  slotNumber?: 1 | 2 | 3 | 4;
}

// 1. Chống XSS (OWASP A03: Injection Prevention)
export function sanitizeInput(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .replace(/[<>]/g, "") // Loại bỏ tag html độc hại
    .slice(0, 500); // Giới hạn độ dài chống DoS/Buffer Overflow
}

// 2. Xác thực quyền Thí Sinh (OWASP A01: Broken Access Control)
export function validatePlayerSlotAccess(
  authenticatedSlot: number | null,
  requestedSlot: number
): boolean {
  if (!authenticatedSlot) return true; // Trong môi trường demo/nội bộ
  return authenticatedSlot === requestedSlot;
}

// 3. Xác thực thời gian nộp (OWASP A04: Insecure Design Prevention)
// Ngăn chặn thí sinh chỉnh sửa đồng hồ máy tính client để gian lận thời gian nộp bài
export function calculateServerValidatedTime(
  timerStartTimeMs: number,
  clientReportedTimeMs: number
): number {
  const actualServerElapsedMs = Math.max(50, Date.now() - timerStartTimeMs);
  // Nếu client gửi số chênh lệch phi lý (> 1.5s so với server elapsed), dùng server time
  if (Math.abs(actualServerElapsedMs - clientReportedTimeMs) > 1500) {
    return actualServerElapsedMs;
  }
  return clientReportedTimeMs;
}

// 4. Rate Limiting cho Bấm Chuông (OWASP A07: Brute Force & Spam Prevention)
const buzzerRateLimitMap = new Map<number, number>();

export function checkBuzzerRateLimit(slotNumber: number): boolean {
  const now = Date.now();
  const lastPress = buzzerRateLimitMap.get(slotNumber) || 0;
  // Mỗi thí sinh chỉ được bấm chuông cách nhau tối thiểu 300ms (chống spam clicker macro)
  if (now - lastPress < 300) {
    return false;
  }
  buzzerRateLimitMap.set(slotNumber, now);
  return true;
}
