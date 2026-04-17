/**
 * resend-reschedule-emails.js
 *
 * Finds all lessons rescheduled in the past N hours and sends
 * reschedule notification emails to the client, trainer, and admins.
 *
 * Usage:
 *   node resend-reschedule-emails.js               ← dry run (preview only, no emails)
 *   node resend-reschedule-emails.js --send         ← actually send emails
 *   node resend-reschedule-emails.js --hours=48     ← look back 48 hours (default: 24)
 *   node resend-reschedule-emails.js --send --hours=48
 *
 * The script will:
 *   1. Query the activities collection for LESSON_RESCHEDULED events
 *   2. For each event, fetch FRESH data from Firestore (booking, trainer, client, org)
 *   3. Print a full audit table so you can verify before sending
 *   4. Send emails via the mail collection (Firebase Email Extension)
 */

'use strict';

const admin = require('firebase-admin');

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--send');
const hoursArg = args.find(a => a.startsWith('--hours='));
const LOOK_BACK_HOURS = hoursArg ? parseInt(hoursArg.split('=')[1], 10) : 24;

// ── Init ──────────────────────────────────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'polyface-ae6d3' });
}
const db = admin.firestore();

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(date, timezone) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone || 'America/Los_Angeles',
  });
}

function fmtDate(date, timezone) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: timezone || 'America/Los_Angeles',
  });
}

function fmtTime(date, timezone) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: timezone || 'America/Los_Angeles',
  });
}

function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val._seconds) return new Date(val._seconds * 1000);
  return new Date(val);
}

// ── Email HTML builder ────────────────────────────────────────────────────────
function buildEmailHtml({ greeting, intro, clientName, trainerName,
  oldDate, oldTime, newDate, newTime, durationMin,
  location, rescheduledBy, orgName, orgEmail, orgColor }) {

  const primary = orgColor || '#3258A3';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Rescheduled</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:${primary};padding:28px 32px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">🔄</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Session Rescheduled</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${orgName}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#111827;font-size:15px;">${greeting}</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">${intro}</p>

              <!-- Old time banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;">
                    <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#92400e;">Previously Scheduled</p>
                    <p style="margin:4px 0 0;color:#78350f;font-size:14px;font-weight:600;">${oldDate} &nbsp;·&nbsp; ${oldTime}</p>
                  </td>
                </tr>
              </table>

              <!-- Arrow -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td align="center" style="color:#6b7280;font-size:20px;padding:4px 0;">↓</td>
                </tr>
              </table>

              <!-- New time card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border:2px solid ${primary};border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="background-color:${primary};padding:10px 18px;">
                    <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:rgba(255,255,255,0.9);">New Session Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${row('Client', clientName)}
                      ${row('Trainer', trainerName)}
                      ${row('Date', newDate, true)}
                      ${row('Time', newTime)}
                      ${row('Duration', durationMin > 0 ? durationMin + ' minutes' : '—')}
                      ${location ? row('Location', location) : ''}
                      ${row('Rescheduled By', rescheduledBy)}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Questions? Contact us at <a href="mailto:${orgEmail}" style="color:${primary};text-decoration:none;font-weight:500;">${orgEmail}</a></p>
              <p style="margin:0;color:#6b7280;font-size:13px;">See you soon!<br><strong style="color:#111827;">${orgName} Team</strong></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">You received this email because a session was rescheduled on your account.</p>
              <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">Powered by <a href="https://skedence.com" style="color:#9ca3af;">Skedence</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  function row(label, value, highlight) {
    if (!value || value === '—') return '';
    return `<tr style="border-top:1px solid #f3f4f6;">
      <td style="padding:12px 18px;color:#6b7280;font-size:14px;font-weight:500;width:38%;">${label}</td>
      <td style="padding:12px 18px;color:${highlight ? primary : '#111827'};font-size:14px;font-weight:${highlight ? '700' : '600'};text-align:right;">${value}</td>
    </tr>`;
  }
}

// ── Core logic ────────────────────────────────────────────────────────────────
async function main() {
  const cutoff = new Date(Date.now() - LOOK_BACK_HOURS * 60 * 60 * 1000);
  const cutoffTs = admin.firestore.Timestamp.fromDate(cutoff);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Reschedule Email Backfill`);
  console.log(`  Mode    : ${DRY_RUN ? '🔍 DRY RUN (no emails sent)' : '📧 SEND MODE'}`);
  console.log(`  Lookback: ${LOOK_BACK_HOURS}h (since ${cutoff.toLocaleString()})`);
  console.log(`${'═'.repeat(60)}\n`);

  // 1. Find all LESSON_RESCHEDULED activities in the window
  // Filter type in-memory to avoid needing a composite Firestore index
  const activitiesSnap = await db.collection('activities')
    .where('timestamp', '>=', cutoffTs)
    .get();

  // Keep only LESSON_RESCHEDULED entries
  const rescheduleActivities = activitiesSnap.docs.filter(d => d.data().type === 'LESSON_RESCHEDULED');

  if (activitiesSnap.empty || rescheduleActivities.length === 0) {
    console.log('✅ No rescheduled lessons found in the past', LOOK_BACK_HOURS, 'hours.');
    process.exit(0);
  }

  console.log(`Found ${rescheduleActivities.length} reschedule event(s). Fetching details...\n`);

  const results = [];

  for (const actDoc of rescheduleActivities) {
    const act = actDoc.data();
    const meta = act.metadata || {};
    const bookingId = meta.bookingId;
    const orgId = act.orgId;

    if (!bookingId || !orgId) {
      console.warn(`  ⚠  Activity ${actDoc.id}: missing bookingId or orgId — skipped`);
      continue;
    }

    // 2. Fetch authoritative current booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.warn(`  ⚠  Booking ${bookingId}: not found — skipped`);
      continue;
    }
    const booking = bookingDoc.data();

    // 3. Fetch trainer (using CURRENT trainerId from booking — most accurate)
    const currentTrainerId = booking.trainerId || booking.trainerUID || meta.newTrainerId;
    const [trainerDoc, clientDoc, orgDoc, alertSettingsDoc] = await Promise.all([
      db.collection('trainers').doc(currentTrainerId).get(),
      db.collection('users').doc(booking.clientUID || booking.clientId).get(),
      db.collection('organizations').doc(orgId).get(),
      db.collection('organizations').doc(orgId).collection('settings').doc('bookingAlerts').get(),
    ]);

    const trainer = trainerDoc.data() || {};
    const client = clientDoc.data() || {};
    const org = orgDoc.data() || {};
    const alertSettings = alertSettingsDoc.data() || {};
    const timezone = alertSettings.timezone || 'America/Los_Angeles';

    // 4. Resolve rescheduledBy name
    let rescheduledByName = act.actorName || 'Admin';
    if (!rescheduledByName && act.actorId) {
      const adminTrainerDoc = await db.collection('trainers').doc(act.actorId).get();
      if (adminTrainerDoc.exists) {
        const d = adminTrainerDoc.data();
        rescheduledByName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Admin';
      }
    }

    // 5. Admin emails
    const adminMembers = await db.collection('orgMembers')
      .where('orgId', '==', orgId)
      .where('role', 'in', ['admin', 'owner'])
      .where('isActive', '==', true)
      .get();

    const adminEmails = [];
    let ownerFirstName = 'there';
    for (const memberDoc of adminMembers.docs) {
      const authId = memberDoc.data().authUserId;
      if (!authId) continue;
      const uq = await db.collection('users').where('authUserId', '==', authId).limit(1).get();
      if (!uq.empty) {
        const e = uq.docs[0].data().email || uq.docs[0].data().emailAddress;
        const fn = uq.docs[0].data().firstName;
        if (e && !adminEmails.includes(e)) { adminEmails.push(e); if (!ownerFirstName || ownerFirstName === 'there') ownerFirstName = fn || 'there'; }
      } else {
        const tq = await db.collection('trainers').where('authUserId', '==', authId).where('orgId', '==', orgId).limit(1).get();
        if (!tq.empty) {
          const e = tq.docs[0].data().email;
          const fn = tq.docs[0].data().firstName;
          if (e && !adminEmails.includes(e)) { adminEmails.push(e); if (!ownerFirstName || ownerFirstName === 'there') ownerFirstName = fn || 'there'; }
        }
      }
    }
    if (adminEmails.length === 0 && org.adminEmail) adminEmails.push(org.adminEmail);

    // 6. Build email data
    const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email || 'Client';
    const trainerName = `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim() || trainer.email || 'Trainer';
    const clientEmail = client.email || client.emailAddress;
    const trainerEmail = trainer.email || trainer.emailAddress;
    const orgName = org.name || 'Skedence';
    const orgEmail = org.email || 'support@skedence.com';
    const orgColor = org.branding?.primaryColor || '#3258A3';
    const location = booking.location || '';

    // Times — old from activity metadata, new from booking doc (authoritative)
    const newStartDate = toDate(booking.startTime);
    const newEndDate = toDate(booking.endTime);
    const oldStartDate = toDate(meta.oldStartTime);
    const durationMin = newStartDate && newEndDate
      ? Math.round((newEndDate - newStartDate) / 60000)
      : 60;

    const sharedParams = {
      clientName, trainerName,
      oldDate: oldStartDate ? fmtDate(oldStartDate, timezone) : '(unknown)',
      oldTime: oldStartDate ? fmtTime(oldStartDate, timezone) : '(unknown)',
      newDate: fmtDate(newStartDate, timezone),
      newTime: fmtTime(newStartDate, timezone),
      durationMin,
      location,
      rescheduledBy: rescheduledByName,
      orgName, orgEmail, orgColor,
    };

    results.push({
      activityId: actDoc.id,
      bookingId,
      orgId,
      orgName,
      orgEmail,
      clientName, clientEmail,
      trainerName, trainerEmail,
      adminEmails,
      ownerFirstName,
      oldDate: sharedParams.oldDate, oldTime: sharedParams.oldTime,
      newDate: sharedParams.newDate, newTime: sharedParams.newTime,
      newStartDate, durationMin, location, rescheduledByName,
      sharedParams,
    });
  }

  if (results.length === 0) {
    console.log('No valid reschedule events to process after validation.');
    process.exit(0);
  }

  // 7. Print audit table
  console.log(`${'─'.repeat(100)}`);
  console.log('AUDIT — Emails that will be sent:');
  console.log(`${'─'.repeat(100)}`);
  for (const r of results) {
    console.log(`\n📅 Booking: ${r.bookingId}  |  Org: ${r.orgName}`);
    console.log(`   Old time : ${r.oldDate}, ${r.oldTime}`);
    console.log(`   New time : ${r.newDate}, ${r.newTime}  (${r.durationMin} min)`);
    console.log(`   Location : ${r.location || '(none)'}`);
    console.log(`   Trainer  : ${r.trainerName} <${r.trainerEmail || '—'}>`);
    console.log(`   Client   : ${r.clientName} <${r.clientEmail || '—'}>`);
    console.log(`   Admins   : ${r.adminEmails.join(', ') || '(none)'}`);
    console.log(`   Rescheduled by: ${r.rescheduledByName}`);

    // Validation warnings
    if (!r.clientEmail) console.warn('   ⚠  WARNING: No client email — client email will be skipped');
    if (!r.trainerEmail) console.warn('   ⚠  WARNING: No trainer email — trainer email will be skipped');
    if (!r.newStartDate) console.warn('   ⚠  WARNING: Missing new start time');
  }
  console.log(`\n${'─'.repeat(100)}`);
  console.log(`Total: ${results.length} booking(s) × up to 3 recipient groups each`);
  console.log(`${'─'.repeat(100)}\n`);

  if (DRY_RUN) {
    console.log('DRY RUN complete — no emails sent.');
    console.log('Re-run with --send to send these emails.\n');
    process.exit(0);
  }

  // 8. Send emails
  console.log('Sending emails...\n');
  let sentCount = 0;
  let errorCount = 0;

  for (const r of results) {
    const { sharedParams, clientEmail, trainerEmail, adminEmails, clientName, trainerName,
      orgName, orgEmail, ownerFirstName, bookingId } = r;

    const mailBatch = [];

    if (clientEmail) {
      mailBatch.push(db.collection('mail').add({
        to: clientEmail,
        from: `${orgName} <no-reply@skedence.com>`,
        replyTo: orgEmail,
        message: {
          subject: `🔄 Your session has been rescheduled – ${sharedParams.newDate}`,
          html: buildEmailHtml({
            ...sharedParams,
            greeting: `Hi ${r.clientName.split(' ')[0] || 'there'},`,
            intro: `Your upcoming session with <strong>${trainerName}</strong> has been rescheduled to a new time.`,
          }),
        },
      }).then(() => { sentCount++; console.log(`  ✅ Client email sent → ${clientEmail}`); })
        .catch(e => { errorCount++; console.error(`  ❌ Client email failed → ${clientEmail}:`, e.message); })
      );
    }

    if (trainerEmail) {
      mailBatch.push(db.collection('mail').add({
        to: trainerEmail,
        from: `${orgName} <no-reply@skedence.com>`,
        replyTo: orgEmail,
        message: {
          subject: `🔄 Session rescheduled – ${clientName}`,
          html: buildEmailHtml({
            ...sharedParams,
            greeting: `Hi ${trainerName.split(' ')[0] || 'there'},`,
            intro: `A session with <strong>${clientName}</strong> has been rescheduled.`,
          }),
        },
      }).then(() => { sentCount++; console.log(`  ✅ Trainer email sent → ${trainerEmail}`); })
        .catch(e => { errorCount++; console.error(`  ❌ Trainer email failed → ${trainerEmail}:`, e.message); })
      );
    }

    if (adminEmails.length > 0) {
      mailBatch.push(db.collection('mail').add({
        to: adminEmails,
        from: `${orgName} <no-reply@skedence.com>`,
        replyTo: orgEmail,
        message: {
          subject: `🔄 Session rescheduled – ${clientName}`,
          html: buildEmailHtml({
            ...sharedParams,
            greeting: `Hi ${ownerFirstName},`,
            intro: `An appointment for <strong>${clientName}</strong> with <strong>${trainerName}</strong> has been rescheduled.`,
          }),
        },
      }).then(() => { sentCount++; console.log(`  ✅ Admin email sent → ${adminEmails.join(', ')}`); })
        .catch(e => { errorCount++; console.error(`  ❌ Admin email failed → ${adminEmails.join(', ')}:`, e.message); })
      );
    }

    await Promise.all(mailBatch);
    console.log(`  Booking ${bookingId} done.\n`);
  }

  console.log(`${'═'.repeat(60)}`);
  console.log(`  Done! Sent: ${sentCount}  Errors: ${errorCount}`);
  console.log(`${'═'.repeat(60)}\n`);
  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
