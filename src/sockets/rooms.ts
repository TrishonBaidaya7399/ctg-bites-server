export const roomForRole = (role: string) => `role:${role}`;
export const roomForOrder = (orderNumber: string) => `order:${orderNumber}`;
export const roomForTable = (qrToken: string) => `table:${qrToken}`;
export const DASHBOARD_ROOM = "dashboard";
export const STAFF_ROLES = ["owner", "manager", "staff"] as const;
