/**
 * Check if the provided email is in the admin allowlist
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Get list of admin emails
 */
export function getAdminEmails(): string[] {
  return process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
}
