import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/isAdmin';
import { sendEmail } from '@/lib/email';

/**
 * Sends residency documents straight to a production as real email attachments.
 *
 * Every file arrives from the performer's own device — either picked fresh or
 * pulled out of the on-device library. They are held in memory only for the
 * length of this request, handed to the mail provider, and discarded. There is
 * no Storage write, no database row, no signed link, and no copy left behind.
 *
 * These are identity documents, so the absence of a server-side copy is the
 * point, not an optimisation.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel rejects a serverless request body over 4.5MB before this handler ever
// runs, so the ceiling here is deliberately below that. The page downscales
// photos client-side, which keeps a normal document set far under it.
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 8;

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.pdf'];

function isAllowed(file: File) {
  if (ALLOWED_TYPES.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext));
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Could not read the upload.' }, { status: 400 });
  }

  const to = String(form.get('to') || '').trim();
  const senderName = String(form.get('senderName') || '').trim();
  const message = String(form.get('message') || '').trim();
  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Enter a valid production email address.' }, { status: 400 });
  }
  if (files.length === 0) {
    return NextResponse.json({ error: 'Attach at least one document.' }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `You can send up to ${MAX_FILES} documents at a time.` }, { status: 400 });
  }

  let total = 0;
  for (const file of files) {
    if (!isAllowed(file)) {
      return NextResponse.json(
        { error: `"${file.name}" is not a supported file type. Use JPG, PNG, HEIC, or PDF.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `"${file.name}" is too large to send.` }, { status: 400 });
    }
    total += file.size;
  }
  if (total > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: 'Those documents are too large to send at once. Send them in two emails.' },
      { status: 400 }
    );
  }

  // Read into memory only. No write to storage, no database row.
  const attachments: { filename: string; content: Buffer }[] = await Promise.all(
    files.map(async file => ({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
    }))
  );

  // Belt and braces: the platform already caps the request body, but the
  // provider limit is checked explicitly so a change to one does not silently
  // outrun the other.
  const attachedBytes = attachments.reduce((sum, a) => sum + a.content.length, 0);
  if (attachedBytes > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Those documents are too large to send at once. Send them in two emails.' },
      { status: 400 }
    );
  }

  const attachmentNames = attachments.map(a => a.filename);

  const displayName = senderName || user.email?.split('@')[0] || 'Performer';
  const subject = `Proof of Residency — ${displayName}`;
  const bodyText =
    (message || 'Please find my proof of residency documents attached as requested.') +
    `\n\nAttached: ${attachmentNames.join(', ')}` +
    `\n\nSent via BGReady on behalf of ${displayName} (${user.email}).`;

  const bodyHtml = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;color:#1f2937;line-height:1.6">
      <p style="white-space:pre-wrap;margin:0 0 16px">${escapeHtml(
        message || 'Please find my proof of residency documents attached as requested.'
      )}</p>
      <p style="margin:0 0 16px"><strong>Attached:</strong> ${attachmentNames
        .map(n => escapeHtml(n))
        .join(', ')}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
      <p style="font-size:12px;color:#6b7280;margin:0">
        Sent via BGReady on behalf of ${escapeHtml(displayName)} (${escapeHtml(user.email || '')}).
        Reply to this email to reach the performer directly.
      </p>
    </div>
  `;

  const result = await sendEmail({
    to,
    subject,
    html: bodyHtml,
    text: bodyText,
    replyTo: user.email || undefined,
    attachments,
  });

  if (!result.success) {
    // Distinguish the two failure modes so a misconfigured deployment is not
    // mistaken for a flaky provider. The detail goes to the server log; the
    // performer gets a plain sentence and a way forward.
    const reason = 'reason' in result ? result.reason : 'unknown';
    console.error('[Residency] Send failed for', user.id, '-> ', to, '| reason:', reason);

    if (reason === 'not configured') {
      return NextResponse.json(
        { error: 'Email sending is not set up on the server. Please contact BGReady support.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error:
          'The production email rejected the message, or the address may be wrong. ' +
          'Double-check the address and try again.',
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: true, to, count: attachments.length });
}
