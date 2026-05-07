export const MASTER_ADMIN_EMAIL = 'billzhangsc@gmail.com';


export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isMasterAdminEmail(email: string | null | undefined): boolean {
  return !!email && normalizeAdminEmail(email) === MASTER_ADMIN_EMAIL;
}
