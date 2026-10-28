// Paths reachable from outside the office network (pure; used by proxy.ts).
const PUBLIC_ATTENDANCE_PATH = /^\/hadir(?:\/?|\/[A-Za-z0-9-]{1,64})$/;

export function isPublicAttendancePath(pathname: string): boolean {
  return PUBLIC_ATTENDANCE_PATH.test(pathname);
}
