// Approved contractors: the roster the office keeps in the app and mirrors to
// GoHighLevel so it can text, drop voicemails and connect calls.

export const TRADES = ['plumbing', 'hvac', 'electrical', 'roofing', 'general', 'cleaning', 'landscaping', 'other'] as const;
export type Trade = (typeof TRADES)[number];

export const TRADE_LABELS: Record<Trade, string> = {
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  electrical: 'Electrical',
  roofing: 'Roofing',
  general: 'General repair',
  cleaning: 'Cleaning',
  landscaping: 'Landscaping',
  other: 'Other',
};

export type ContractorStatus = 'approved' | 'inactive';

export type Contractor = {
  id: string;
  name: string;
  company: string;
  trades: Trade[];
  /** E.164, for example +18165550100. Required: every channel needs it. */
  phone: string;
  email: string;
  notes: string;
  status: ContractorStatus;
  /** When the contractor agreed to automated texts and voicemail. Voicemail and call refuse without it. */
  consentAt: number | null;
  ghlContactId: string | null;
  ghlSyncError: string | null;
  ghlSyncedAt: number | null;
  searchKey: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

/** What the form submits. Everything else is derived on the server. */
export type ContractorInput = {
  name: string;
  company?: string;
  trades: Trade[];
  phone: string;
  email?: string;
  notes?: string;
  status?: ContractorStatus;
  /** true records consent now; false clears it; undefined leaves it alone. */
  consent?: boolean;
};

export type ContactLogType = 'sms' | 'voicemail' | 'call';
export type ContactLogStatus = 'sent' | 'failed' | 'dry-run';

export type ContactLogEntry = {
  id: string;
  type: ContactLogType;
  templateId: string | null;
  message: string | null;
  ticketId: string | null;
  status: ContactLogStatus;
  actorUid: string;
  actorName: string | null;
  ghlResponseId: string | null;
  ghlError: string | null;
  createdAt: number;
};

export type SmsTemplate = { id: string; label: string; body: string };

export const VOICEMAIL_SITUATIONS = ['newJob', 'confirmVisit', 'urgent'] as const;
export type VoicemailSituation = (typeof VOICEMAIL_SITUATIONS)[number];

export const VOICEMAIL_LABELS: Record<VoicemailSituation, string> = {
  newJob: 'New job available',
  confirmVisit: 'Confirm scheduled visit',
  urgent: 'Urgent, call now',
};

export type ContractorCommsSettings = {
  voicemailWorkflows: Partial<Record<VoicemailSituation, string>>;
  callWorkflowId: string;
  smsTemplates: SmsTemplate[];
  updatedAt: number | null;
  updatedBy: string | null;
};

/** Which actions the page may offer, given settings, env and credentials. */
export type ContractorCommsConfigured = {
  sms: boolean;
  voicemail: Record<VoicemailSituation, boolean>;
  call: boolean;
  /** No GoHighLevel calls are made; everything is logged as dry-run. */
  dryRun: boolean;
};

export type TemplateVars = { contractor?: string; property?: string; ticket?: string; date?: string };
