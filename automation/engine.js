// Pure decision + template engine for the rental communications autopilot.
//
// No I/O here: computeQueue() takes plain data (tenants, maintenance requests,
// payments), the sent/skip log, settings, and "today" as a YYYY-MM-DD string,
// and returns the list of messages that should go out today. server.js owns
// reading Firestore / sample data and actually sending; this file owns the
// rules and the words. Keeping it pure lets test.js verify every rule with
// fixed dates.

'use strict';

// ---------------------------------------------------------------------------
// Date helpers — all dates are local-time YYYY-MM-DD strings.
// ---------------------------------------------------------------------------

function toDateStr(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[0].slice(0, 10);
    const d = new Date(value);
    return isNaN(d) ? null : localDateStr(d);
  }
  // Firestore Timestamp ({seconds}/{_seconds}) or Date
  if (typeof value === 'object') {
    const secs = value.seconds ?? value._seconds;
    if (typeof secs === 'number') return localDateStr(new Date(secs * 1000));
    if (value instanceof Date) return localDateStr(value);
    if (typeof value.toDate === 'function') return localDateStr(value.toDate());
  }
  return null;
}

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from a to b (positive when b is after a). */
function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month is 1-based
}

/** Shift a YYYY-MM period by n months. */
function shiftPeriod(period, n) {
  const [y, m] = period.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/** Rent due date for the month containing `period` (YYYY-MM), clamped (e.g. due day 31 in June -> June 30). */
function dueDateForPeriod(period, dueDay) {
  const [y, m] = period.split('-').map(Number);
  const day = Math.min(Math.max(1, dueDay || 1), daysInMonth(y, m));
  return `${period}-${String(day).padStart(2, '0')}`;
}

function periodOf(dateStr) {
  return dateStr.slice(0, 7);
}

function prettyDate(s) {
  if (!s) return '';
  return parseDate(s).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function money(n) {
  const num = Number(n);
  if (!isFinite(num)) return String(n);
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS = {
  companyName: 'Next Level Rentals',
  managerName: 'The Next Level Rentals Team',
  replyEmail: '',
  replyPhone: '',
  portalUrl: '',
  defaultDueDay: 1,
  // Days before the due date to send the upcoming reminder.
  remindDaysBefore: 3,
  // Days after the due date for each late notice.
  lateSteps: [3, 7, 14],
  lateFeeText: 'Per your lease, a late fee may apply to payments received after the due date.',
  // In-progress maintenance with no update for this many days gets a check-in nudge.
  maintenanceStaleDays: 5,
  // Onboarding steps older than this many days are dropped instead of sent.
  onboardingStaleDays: 14,
  vendors: [],
  // Per-tenant overrides keyed by tenant id: { dueDay, rentPaused, notes }
  tenantOverrides: {},
};

function mergeSettings(saved) {
  const s = { ...DEFAULT_SETTINGS, ...(saved || {}) };
  s.lateSteps = Array.isArray(s.lateSteps) && s.lateSteps.length ? s.lateSteps : DEFAULT_SETTINGS.lateSteps;
  s.tenantOverrides = s.tenantOverrides || {};
  s.vendors = Array.isArray(s.vendors) ? s.vendors : [];
  return s;
}

// ---------------------------------------------------------------------------
// Message templates
// ---------------------------------------------------------------------------

function firstNameOf(tenant) {
  const name = tenant.displayName || tenant.email || 'there';
  return name.split(' ')[0];
}

function unitLine(tenant) {
  return tenant.unit || tenant.address || 'your unit';
}

function signature(s) {
  const lines = [s.managerName, s.companyName];
  if (s.replyPhone) lines.push(s.replyPhone);
  if (s.replyEmail) lines.push(s.replyEmail);
  return lines.filter(Boolean).join('\n');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Branded shell for a hand-edited plain-text body. The text is expected to
 * already end with the signature (it comes from an edited `text` version), so
 * no extra signature is appended.
 */
function customEmailHtml(settings, heading, text) {
  const body = escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:10px 0;color:#4a5568;">${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background-color:#f4f4f4;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background:linear-gradient(135deg,#0f766e 0%,#0369a1 100%);color:white;padding:26px 20px;text-align:center;">
      <h1 style="margin:0;font-size:22px;font-weight:600;">${escapeHtml(settings.companyName)}</h1>
    </div>
    <div style="padding:28px 22px;">
      <h2 style="color:#2d3748;font-size:19px;margin-top:0;">${escapeHtml(heading)}</h2>
      ${body}
    </div>
    <div style="background-color:#f7fafc;padding:16px;text-align:center;color:#718096;font-size:13px;border-top:1px solid #e2e8f0;">
      ${escapeHtml(settings.companyName)} · Property Management
    </div>
  </div></body></html>`;
}

/** Wrap plain paragraphs in the portal's branded email shell. */
function emailHtml(settings, heading, paragraphs, detailRows) {
  const detailBox = detailRows && detailRows.length
    ? `<div style="background:#f7fafc;border-left:4px solid #0f766e;padding:15px;margin:20px 0;border-radius:4px;">
        ${detailRows.map(([k, v]) => `<p style="margin:6px 0;color:#4a5568;"><strong style="color:#2d3748;">${k}:</strong> ${v}</p>`).join('')}
      </div>`
    : '';
  const body = paragraphs.map((p) => `<p style="margin:10px 0;color:#4a5568;">${p.replace(/\n/g, '<br>')}</p>`).join('');
  const portalBtn = settings.portalUrl
    ? `<p style="margin:20px 0;"><a href="${settings.portalUrl}" style="display:inline-block;padding:12px 30px;background-color:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Open Tenant Portal</a></p>`
    : '';
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background-color:#f4f4f4;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background:linear-gradient(135deg,#0f766e 0%,#0369a1 100%);color:white;padding:26px 20px;text-align:center;">
      <h1 style="margin:0;font-size:22px;font-weight:600;">${settings.companyName}</h1>
    </div>
    <div style="padding:28px 22px;">
      <h2 style="color:#2d3748;font-size:19px;margin-top:0;">${heading}</h2>
      ${body}
      ${detailBox}
      ${portalBtn}
      <p style="margin:18px 0 0;color:#4a5568;">${signature(settings).replace(/\n/g, '<br>')}</p>
    </div>
    <div style="background-color:#f7fafc;padding:16px;text-align:center;color:#718096;font-size:13px;border-top:1px solid #e2e8f0;">
      ${settings.companyName} · Property Management
    </div>
  </div></body></html>`;
}

function textVersion(paragraphs, settings) {
  return paragraphs.join('\n\n') + '\n\n' + signature(settings);
}

// Each template returns { subject, paragraphs, detailRows?, sms }.
const TEMPLATES = {
  // ----- rent -----
  'rent-upcoming': (t, ctx, s) => ({
    subject: `Friendly reminder: rent due ${prettyDate(ctx.dueDate)}`,
    heading: 'Rent Reminder',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `Just a friendly reminder that your rent of ${money(t.monthlyRent)} for ${unitLine(t)} is due on ${prettyDate(ctx.dueDate)}.`,
      `If you've already scheduled your payment, you're all set — thank you!`,
    ],
    detailRows: [['Amount', money(t.monthlyRent)], ['Due date', prettyDate(ctx.dueDate)], ['Unit', unitLine(t)]],
    sms: `Hi ${firstNameOf(t)}, friendly reminder from ${s.companyName}: rent of ${money(t.monthlyRent)} is due ${prettyDate(ctx.dueDate)}. Thank you!`,
  }),
  'rent-due': (t, ctx, s) => ({
    subject: `Rent due today — ${money(t.monthlyRent)}`,
    heading: 'Rent Due',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `This is a reminder that your rent of ${money(t.monthlyRent)} for ${unitLine(t)} is due ${ctx.daysLate > 0 ? `(due date was ${prettyDate(ctx.dueDate)})` : 'today'}.`,
      `If you've already sent your payment, please disregard this message — and thank you!`,
    ],
    detailRows: [['Amount', money(t.monthlyRent)], ['Due date', prettyDate(ctx.dueDate)], ['Unit', unitLine(t)]],
    sms: `Hi ${firstNameOf(t)}, your rent of ${money(t.monthlyRent)} is due today. If you've already paid, please disregard. — ${s.companyName}`,
  }),
  'rent-late-1': (t, ctx, s) => ({
    subject: `Past due: rent for ${unitLine(t)}`,
    heading: 'Rent Past Due',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `Our records show your rent of ${money(t.monthlyRent)} due ${prettyDate(ctx.dueDate)} hasn't been received yet (${ctx.daysLate} days past due).`,
      s.lateFeeText,
      `If you've already paid, or if something has come up and you'd like to talk through options, please reply and let us know.`,
    ],
    detailRows: [['Amount due', money(t.monthlyRent)], ['Original due date', prettyDate(ctx.dueDate)], ['Days past due', String(ctx.daysLate)]],
    sms: `Hi ${firstNameOf(t)}, your rent of ${money(t.monthlyRent)} (due ${prettyDate(ctx.dueDate)}) is now ${ctx.daysLate} days past due. Please pay or reply to discuss. — ${s.companyName}`,
  }),
  'rent-late-2': (t, ctx, s) => ({
    subject: `Second notice: rent ${ctx.daysLate} days past due`,
    heading: 'Second Notice — Rent Past Due',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `This is a second notice that your rent of ${money(t.monthlyRent)} due ${prettyDate(ctx.dueDate)} remains unpaid (${ctx.daysLate} days past due).`,
      s.lateFeeText,
      `Please submit payment as soon as possible, or contact us today if you need to arrange a payment plan.`,
    ],
    detailRows: [['Amount due', money(t.monthlyRent)], ['Original due date', prettyDate(ctx.dueDate)], ['Days past due', String(ctx.daysLate)]],
    sms: `Second notice from ${s.companyName}: rent of ${money(t.monthlyRent)} is ${ctx.daysLate} days past due. Please pay or contact us today to arrange a plan.`,
  }),
  'rent-late-3': (t, ctx, s) => ({
    subject: `Urgent: rent ${ctx.daysLate} days past due — action required`,
    heading: 'Final Notice — Rent Past Due',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `Your rent of ${money(t.monthlyRent)} due ${prettyDate(ctx.dueDate)} is now ${ctx.daysLate} days past due. This is a final notice before we begin the formal remedies available under your lease.`,
      s.lateFeeText,
      `Please pay immediately or contact us today. We would much rather work something out with you than escalate.`,
    ],
    detailRows: [['Amount due', money(t.monthlyRent)], ['Original due date', prettyDate(ctx.dueDate)], ['Days past due', String(ctx.daysLate)]],
    sms: `URGENT from ${s.companyName}: rent of ${money(t.monthlyRent)} is ${ctx.daysLate} days past due. Please pay or contact us today to avoid further action.`,
  }),

  // ----- onboarding -----
  'onboard-welcome': (t, ctx, s) => ({
    subject: `Welcome to ${unitLine(t)}! Your move-in details`,
    heading: 'Welcome!',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `Welcome to ${s.companyName}! We're excited to have you at ${unitLine(t)}. Your lease begins on ${prettyDate(ctx.leaseStart)}.`,
      `Over the next few days we'll send you everything you need: portal access for paying rent and submitting maintenance requests, plus your move-in checklist.`,
      `In the meantime, remember to set up your utilities and renter's insurance before move-in day. Reply here with any questions — we're happy to help.`,
    ],
    detailRows: [['Unit', unitLine(t)], ['Lease start', prettyDate(ctx.leaseStart)], ['Monthly rent', money(t.monthlyRent)]],
    sms: `Welcome to ${s.companyName}, ${firstNameOf(t)}! Your lease at ${unitLine(t)} starts ${prettyDate(ctx.leaseStart)}. Watch your email for move-in details.`,
  }),
  'onboard-portal': (t, ctx, s) => ({
    subject: `Set up your tenant portal before move-in`,
    heading: 'Set Up Your Tenant Portal',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `Your move-in at ${unitLine(t)} is almost here (${prettyDate(ctx.leaseStart)}). Before then, please set up your tenant portal account — it's where you'll pay rent, submit maintenance requests, and find your lease documents.`,
      s.portalUrl ? `Use the button below to get started with the email address this message was sent to.` : `We'll send your portal invitation to this email address.`,
      `Rent (${money(t.monthlyRent)}) is due on the ${ordinal(ctx.dueDay)} of each month.`,
    ],
    detailRows: [['Lease start', prettyDate(ctx.leaseStart)], ['Monthly rent', money(t.monthlyRent)], ['Rent due', `${ordinal(ctx.dueDay)} of the month`]],
    sms: `${s.companyName}: your move-in at ${unitLine(t)} is ${prettyDate(ctx.leaseStart)}. Please set up your tenant portal — check your email for the link.`,
  }),
  'onboard-movein': (t, ctx, s) => ({
    subject: `Move-in day: keys, checklist, and who to contact`,
    heading: 'Happy Move-In Day!',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `Today's the day — welcome to ${unitLine(t)}!`,
      `A few reminders for move-in: document the condition of the unit with photos within 48 hours, test your smoke detectors, and locate your water shut-off valve.`,
      `If anything isn't right when you arrive, reply here or submit a maintenance request and we'll take care of it quickly.`,
    ],
    detailRows: [['Unit', unitLine(t)], ['Lease start', prettyDate(ctx.leaseStart)]],
    sms: `Happy move-in day, ${firstNameOf(t)}! Welcome to ${unitLine(t)}. Reply here if you need anything today. — ${s.companyName}`,
  }),
  'onboard-checkin': (t, ctx, s) => ({
    subject: `How's the new place? One-week check-in`,
    heading: 'One-Week Check-In',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `You've been at ${unitLine(t)} for about a week now — how is everything?`,
      `If you've spotted anything that needs attention (a drip, a sticky lock, anything at all), just reply to this message or submit a maintenance request and we'll get it handled.`,
      `Thanks for being a ${s.companyName} resident!`,
    ],
    sms: `Hi ${firstNameOf(t)}, it's ${s.companyName} — one week into ${unitLine(t)}! Anything need attention? Just reply and we'll handle it.`,
  }),

  // ----- renewal / move-out -----
  'renewal-offer': (t, ctx, s) => ({
    subject: `Your lease ends ${prettyDate(ctx.leaseEnd)} — let's talk renewal`,
    heading: 'Lease Renewal',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `Your lease at ${unitLine(t)} ends on ${prettyDate(ctx.leaseEnd)} — about ${ctx.daysToEnd} days from now. We'd love to have you stay!`,
      `Reply to this message to let us know if you'd like to renew, and we'll send over the renewal terms. If your plans are changing, letting us know early helps us both.`,
    ],
    detailRows: [['Unit', unitLine(t)], ['Lease end', prettyDate(ctx.leaseEnd)], ['Current rent', money(t.monthlyRent)]],
    sms: `Hi ${firstNameOf(t)}, your lease at ${unitLine(t)} ends ${prettyDate(ctx.leaseEnd)}. Want to renew? Reply and we'll send the details. — ${s.companyName}`,
  }),
  'renewal-followup': (t, ctx, s) => ({
    subject: `Renewal decision needed — lease ends in ${ctx.daysToEnd} days`,
    heading: 'Lease Renewal — Follow-Up',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `Just following up: your lease at ${unitLine(t)} ends on ${prettyDate(ctx.leaseEnd)} (${ctx.daysToEnd} days away) and we haven't heard your renewal decision yet.`,
      `Reply to this message to renew or to let us know you're moving on — either way, we want to make the process easy for you.`,
    ],
    detailRows: [['Lease end', prettyDate(ctx.leaseEnd)], ['Days remaining', String(ctx.daysToEnd)]],
    sms: `${s.companyName}: your lease ends ${prettyDate(ctx.leaseEnd)} (${ctx.daysToEnd} days). Please reply with your renewal decision so we can plan together.`,
  }),
  'moveout-notice': (t, ctx, s) => ({
    subject: `Move-out instructions — lease ends ${prettyDate(ctx.leaseEnd)}`,
    heading: 'Move-Out Instructions',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `Your lease at ${unitLine(t)} ends on ${prettyDate(ctx.leaseEnd)} (${ctx.daysToEnd} days from now). Here's what to know for a smooth move-out and full deposit return:`,
      `1. Schedule your move-out walkthrough with us.\n2. Remove all belongings and clean the unit (broom-clean, appliances wiped, trash out).\n3. Return all keys, fobs, and garage remotes.\n4. Provide your forwarding address for the deposit return.`,
      `If you've actually decided to renew, reply immediately and we'll sort it out.`,
    ],
    detailRows: [['Unit', unitLine(t)], ['Lease end', prettyDate(ctx.leaseEnd)]],
    sms: `${s.companyName}: your lease ends ${prettyDate(ctx.leaseEnd)}. Check your email for move-out instructions, or reply if you intend to renew.`,
  }),

  // ----- maintenance -----
  'maint-ack': (t, ctx, s) => ({
    subject: `We got your maintenance request: ${ctx.request.title}`,
    heading: 'Maintenance Request Received',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `We've received your maintenance request and we're on it. We'll follow up as soon as it's scheduled with a technician.`,
      ctx.request.priority === 'urgent' || ctx.request.priority === 'high'
        ? `Since this is marked ${ctx.request.priority}, we're treating it as a priority. If this is an emergency (active flooding, gas smell, no heat in winter), please call us right away${s.replyPhone ? ` at ${s.replyPhone}` : ''}.`
        : `If anything changes or gets worse, just reply to this message.`,
    ],
    detailRows: [['Request', ctx.request.title], ['Priority', ctx.request.priority], ['Status', 'Received'], ['Reported', prettyDate(ctx.createdDate)]],
    sms: `${s.companyName}: we received your maintenance request "${ctx.request.title}" and will follow up once it's scheduled. Reply if anything changes.`,
  }),
  'maint-dispatch': (t, ctx, s) => ({
    subject: `Work order: ${ctx.request.title} at ${unitLine(t)}`,
    heading: 'Work Order',
    paragraphs: [
      `Hi${ctx.vendorName ? ` ${ctx.vendorName}` : ''},`,
      `We have a ${ctx.request.priority}-priority maintenance job for you:`,
      `Issue: ${ctx.request.title}\nDetails: ${ctx.request.description || '(no additional details)'}\nLocation: ${unitLine(t)}\nTenant: ${t.displayName || ''}${t.phoneNumber ? ` — ${t.phoneNumber}` : ''}`,
      `Please contact the tenant directly to schedule access, and confirm with us once it's booked.`,
    ],
    sms: `Work order from ${s.companyName}: ${ctx.request.title} (${ctx.request.priority}) at ${unitLine(t)}. Tenant: ${t.displayName || ''}${t.phoneNumber ? ' ' + t.phoneNumber : ''}. Please schedule directly.`,
  }),
  'maint-update': (t, ctx, s) => ({
    subject: `Update on your maintenance request: ${ctx.request.title}`,
    heading: 'Maintenance Update',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `Quick update on your maintenance request "${ctx.request.title}": it's in progress and hasn't fallen through the cracks. We're staying on the vendor to get it finished.`,
      `Reply to this message if the situation has changed or if scheduling has been an issue — we'll sort it out.`,
    ],
    detailRows: [['Request', ctx.request.title], ['Status', 'In progress'], ['Reported', prettyDate(ctx.createdDate)]],
    sms: `${s.companyName}: your request "${ctx.request.title}" is still in progress — we're staying on it. Reply if anything has changed.`,
  }),
  'maint-complete': (t, ctx, s) => ({
    subject: `Your maintenance request is complete: ${ctx.request.title}`,
    heading: 'Maintenance Complete',
    paragraphs: [
      `Hi ${firstNameOf(t)},`,
      `Good news — your maintenance request "${ctx.request.title}" has been completed.`,
      `Please take a quick look and reply to this message if anything wasn't fixed to your satisfaction. We want it done right.`,
      `Thanks for your patience!`,
    ],
    detailRows: [['Request', ctx.request.title], ['Status', 'Completed']],
    sms: `${s.companyName}: your maintenance request "${ctx.request.title}" is complete. Reply if anything still isn't right.`,
  }),
};

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function renderTemplate(kind, tenant, ctx, settings) {
  const tpl = TEMPLATES[kind];
  if (!tpl) throw new Error(`Unknown template: ${kind}`);
  const out = tpl(tenant, ctx, settings);
  return {
    subject: out.subject,
    html: emailHtml(settings, out.heading, out.paragraphs, out.detailRows),
    text: textVersion(out.paragraphs, settings),
    sms: out.sms,
  };
}

// ---------------------------------------------------------------------------
// Queue computation
// ---------------------------------------------------------------------------

/** Stage of the rent cycle for a given days-since-due, or null. */
function rentStage(daysSinceDue, settings) {
  const [l1, l2, l3] = settings.lateSteps;
  // Stop auto-chasing well past the final notice — at that point it's a
  // ledger/collections conversation, not a reminder. (The Tenants tab still
  // shows the month as unpaid.)
  if (daysSinceDue > l3 + 10) return null;
  if (daysSinceDue >= l3) return { key: 'rent-late-3', rank: 5 };
  if (daysSinceDue >= l2) return { key: 'rent-late-2', rank: 4 };
  if (daysSinceDue >= l1) return { key: 'rent-late-1', rank: 3 };
  if (daysSinceDue >= 0) return { key: 'rent-due', rank: 2 };
  if (daysSinceDue >= -settings.remindDaysBefore) return { key: 'rent-upcoming', rank: 1 };
  return null;
}

const RENT_RANKS = { 'rent-upcoming': 1, 'rent-due': 2, 'rent-late-1': 3, 'rent-late-2': 4, 'rent-late-3': 5 };

const ONBOARD_STEPS = [
  { key: 'onboard-welcome', offset: -7 },
  { key: 'onboard-portal', offset: -3 },
  { key: 'onboard-movein', offset: 0 },
  { key: 'onboard-checkin', offset: 7 },
];

/**
 * Is rent for `period` covered by a recorded payment?
 * Accepts Firestore payment docs (dueDate/paidAt in the period, status paid-ish)
 * and local paid-marks ("tenantId|period").
 */
function isRentCovered(tenant, period, payments, marks) {
  if (marks.has(`${tenant.id}|${period}`)) return true;
  const PAID = new Set(['paid', 'succeeded']);
  return (payments || []).some((p) => {
    if (p.tenantId !== tenant.id) return false;
    if (p.type && p.type !== 'rent') return false;
    if (!PAID.has(String(p.status))) return false;
    const due = toDateStr(p.dueDate);
    const paidAt = toDateStr(p.paidAt);
    return (due && periodOf(due) === period) || (paidAt && periodOf(paidAt) === period);
  });
}

/**
 * Compute everything that should be in today's review queue.
 *
 * @param data     { tenants, maintenance, payments } plain objects (dates may be
 *                 ISO strings or Firestore-style {seconds} objects)
 * @param log      array of { key, action } — every send/skip ever recorded
 * @param settings merged settings (mergeSettings output)
 * @param today    'YYYY-MM-DD'
 */
function computeQueue(data, log, settings, today) {
  const done = new Set((log || []).map((e) => e.key));
  const paidMarks = new Set(
    (log || []).filter((e) => e.action === 'paid').map((e) => e.key.replace(/^paid\|/, ''))
  );
  const renewedMarks = new Set(
    (log || []).filter((e) => e.action === 'renewed').map((e) => e.key.replace(/^renewed\|/, ''))
  );

  const items = [];
  const tenants = (data.tenants || []).filter((t) => t.email || t.phoneNumber);
  const byId = new Map(tenants.map((t) => [t.id, t]));

  for (const t of tenants) {
    const ov = settings.tenantOverrides[t.id] || {};
    const dueDay = ov.dueDay || settings.defaultDueDay;
    const leaseStart = toDateStr(t.leaseStart);
    const leaseEnd = toDateStr(t.leaseEnd);
    const active = t.isLeaseActive !== false; // missing flag = assume active
    const started = !leaseStart || leaseStart <= today;
    const ended = leaseEnd && leaseEnd < today;

    // ----- rent -----
    if (active && started && !ended && !ov.rentPaused && Number(t.monthlyRent) > 0) {
      // Look at last month, this month, and (within the reminder window) next
      // month — an unpaid due date from late last month must still be chased
      // early this month. If multiple cycles apply (e.g. last month late AND
      // next month upcoming), surface only the most severe one.
      const periods = [
        shiftPeriod(periodOf(today), -1),
        periodOf(today),
        periodOf(addDays(today, settings.remindDaysBefore)),
      ];
      let best = null;
      for (const period of [...new Set(periods)]) {
        const dueDate = dueDateForPeriod(period, dueDay);
        const daysSinceDue = daysBetween(dueDate, today);
        const stage = rentStage(daysSinceDue, settings);
        if (!stage) continue;
        if (leaseStart && dueDate < leaseStart) continue;
        if (leaseEnd && dueDate > leaseEnd) continue;
        if (isRentCovered(t, period, data.payments, paidMarks)) continue;

        // Skip if this stage — or any later stage — was already handled this period.
        const handled = Object.keys(RENT_RANKS).some(
          (k) => RENT_RANKS[k] >= stage.rank && done.has(`rent|${t.id}|${period}|${k}`)
        );
        if (handled) continue;

        if (!best || stage.rank > best.stage.rank) {
          best = { period, dueDate, daysSinceDue, stage };
        }
      }
      if (best) {
        const { period, dueDate, daysSinceDue, stage } = best;
        items.push(buildItem({
          key: `rent|${t.id}|${period}|${stage.key}`,
          workflow: 'rent', kind: stage.key, tenant: t, settings,
          ctx: { dueDate, daysLate: Math.max(0, daysSinceDue), period },
          due: dueDate,
          note: daysSinceDue > 0 ? `${daysSinceDue} days late` : daysSinceDue === 0 ? 'due today' : `due in ${-daysSinceDue} days`,
          actions: ['send', 'skip', 'mark-paid'],
        }));
      }
    }

    // ----- onboarding -----
    if (leaseStart && Math.abs(daysBetween(leaseStart, today)) <= 45) {
      for (const step of ONBOARD_STEPS) {
        const stepDate = addDays(leaseStart, step.offset);
        const age = daysBetween(stepDate, today);
        if (age < 0 || age > settings.onboardingStaleDays) continue;
        const key = `onboard|${t.id}|${leaseStart}|${step.key}`;
        if (done.has(key)) continue;
        items.push(buildItem({
          key, workflow: 'onboarding', kind: step.key, tenant: t, settings,
          ctx: { leaseStart, dueDay },
          due: stepDate,
          note: step.offset === 0 ? 'move-in day' : step.offset < 0 ? `${-step.offset} days before move-in` : `${step.offset} days after move-in`,
          actions: ['send', 'skip'],
        }));
      }
    }

    // ----- renewal / move-out -----
    if (leaseEnd && active && !renewedMarks.has(`${t.id}|${leaseEnd}`)) {
      const daysToEnd = daysBetween(today, leaseEnd);
      let stage = null;
      if (daysToEnd >= 0 && daysToEnd <= 30) stage = { key: 'moveout-notice', rank: 3 };
      else if (daysToEnd <= 60) stage = { key: 'renewal-followup', rank: 2 };
      else if (daysToEnd <= 90) stage = { key: 'renewal-offer', rank: 1 };
      if (stage) {
        const RANKS = { 'renewal-offer': 1, 'renewal-followup': 2, 'moveout-notice': 3 };
        const key = `renewal|${t.id}|${leaseEnd}|${stage.key}`;
        const handled = Object.keys(RANKS).some(
          (k) => RANKS[k] >= stage.rank && done.has(`renewal|${t.id}|${leaseEnd}|${k}`)
        );
        if (!handled) {
          items.push(buildItem({
            key, workflow: 'renewal', kind: stage.key, tenant: t, settings,
            ctx: { leaseEnd, daysToEnd },
            due: leaseEnd,
            note: `lease ends in ${daysToEnd} days`,
            actions: ['send', 'skip', 'mark-renewed'],
          }));
        }
      }
    }
  }

  // ----- maintenance -----
  for (const r of data.maintenance || []) {
    const t = byId.get(r.tenantId);
    if (!t || t.isLeaseActive === false) continue;
    const createdDate = toDateStr(r.createdAt) || today;
    const updatedDate = toDateStr(r.updatedAt) || createdDate;

    if (r.status === 'submitted' || r.status === 'pending') {
      const ackKey = `maint|${r.id}|ack`;
      if (!done.has(ackKey)) {
        items.push(buildItem({
          key: ackKey, workflow: 'maintenance', kind: 'maint-ack', tenant: t, settings,
          ctx: { request: r, createdDate }, due: createdDate,
          note: `new ${r.priority} request`, actions: ['send', 'skip'], requestId: r.id,
        }));
      }
      const dispatchKey = `maint|${r.id}|dispatch`;
      if (!done.has(dispatchKey)) {
        const vendor = pickVendor(settings.vendors, r);
        items.push(buildItem({
          key: dispatchKey, workflow: 'maintenance', kind: 'maint-dispatch', tenant: t, settings,
          ctx: { request: r, createdDate, vendorName: vendor ? vendor.name : '' },
          due: createdDate,
          note: vendor ? `dispatch to ${vendor.name}` : 'dispatch to vendor',
          actions: ['copy', 'skip'], requestId: r.id,
          recipientOverride: vendor
            ? { name: vendor.name, email: vendor.email || '', phone: vendor.phone || '' }
            : { name: 'your vendor', email: '', phone: '' },
        }));
      }
    }

    if (r.status === 'in_progress') {
      const staleDays = daysBetween(updatedDate, today);
      if (staleDays >= settings.maintenanceStaleDays) {
        const key = `maint|${r.id}|update|${updatedDate}`;
        if (!done.has(key)) {
          items.push(buildItem({
            key, workflow: 'maintenance', kind: 'maint-update', tenant: t, settings,
            ctx: { request: r, createdDate }, due: updatedDate,
            note: `no update in ${staleDays} days`, actions: ['send', 'skip'], requestId: r.id,
          }));
        }
      }
    }

    if (r.status === 'completed') {
      const key = `maint|${r.id}|complete`;
      const age = daysBetween(updatedDate, today);
      if (!done.has(key) && age <= 14) {
        items.push(buildItem({
          key, workflow: 'maintenance', kind: 'maint-complete', tenant: t, settings,
          ctx: { request: r, createdDate }, due: updatedDate,
          note: 'completed — close the loop', actions: ['send', 'skip'], requestId: r.id,
        }));
      }
    }
  }

  const ORDER = { rent: 0, maintenance: 1, onboarding: 2, renewal: 3 };
  items.sort((a, b) => (ORDER[a.workflow] - ORDER[b.workflow]) || a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
  return items;
}

function pickVendor(vendors, request) {
  if (!vendors || !vendors.length) return null;
  const hay = `${request.category || ''} ${request.title || ''} ${request.description || ''}`.toLowerCase();
  const match = vendors.find((v) => v.trade && hay.includes(String(v.trade).toLowerCase()));
  return match || vendors[0];
}

function buildItem({ key, workflow, kind, tenant, settings, ctx, due, note, actions, requestId, recipientOverride }) {
  const msg = renderTemplate(kind, tenant, ctx, settings);
  const recipient = recipientOverride || {
    name: tenant.displayName || tenant.email,
    email: tenant.email || '',
    phone: tenant.phoneNumber || '',
  };
  return {
    id: key,
    workflow,
    kind,
    tenantId: tenant.id,
    tenantName: tenant.displayName || tenant.email,
    recipient,
    ghlContactId: tenant.ghlContactId || null,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    sms: msg.sms,
    due,
    note,
    actions,
    requestId: requestId || null,
    period: ctx.period || null,
    leaseEnd: ctx.leaseEnd || null,
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  mergeSettings,
  computeQueue,
  renderTemplate,
  customEmailHtml,
  isRentCovered,
  rentStage,
  dueDateForPeriod,
  toDateStr,
  addDays,
  daysBetween,
  localDateStr,
  periodOf,
  shiftPeriod,
};
