import { supabaseAdmin } from './supabase/admin'
export { supabaseAdmin }

export function getEnvAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdminUser(email: string): Promise<boolean> {
  const normalized = email.toLowerCase();
  if (getEnvAdminEmails().includes(normalized)) return true;
  try {
    const { data } = await supabaseAdmin
      .from('admin_emails')
      .select('email')
      .eq('email', normalized)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export async function verifyAdminRequest(request: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.email) return null;
  if (!(await isAdminUser(user.email))) return null;
  return { id: user.id, email: user.email };
}
