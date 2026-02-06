import type { MaintenanceStatus } from '@/types/maintenance';

// Base styles for all email templates
const baseStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #0f766e 0%, #0369a1 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .content h2 {
      color: #2d3748;
      font-size: 20px;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .content p {
      margin: 10px 0;
      color: #4a5568;
    }
    .detail-box {
      background-color: #f7fafc;
      border-left: 4px solid #0f766e;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .detail-box strong {
      color: #2d3748;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #0f766e;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .button:hover {
      background-color: #115e59;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin: 10px 0;
    }
    .status-submitted {
      background-color: #e0f2fe;
      color: #0369a1;
    }
    .status-in_progress {
      background-color: #fef3c7;
      color: #b45309;
    }
    .status-completed {
      background-color: #dcfce7;
      color: #0f766e;
    }
    .status-cancelled {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .footer {
      background-color: #f7fafc;
      padding: 20px;
      text-align: center;
      color: #718096;
      font-size: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #0f766e;
      text-decoration: none;
    }
  </style>
`;

interface RequestConfirmationData {
  tenantName: string;
  requestId: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  portalUrl: string;
}

export function requestConfirmationEmail(data: RequestConfirmationData): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Maintenance Request Received</h1>
        </div>
        <div class="content">
          <h2>Hi ${data.tenantName},</h2>
          <p>We've received your maintenance request and will address it as soon as possible.</p>

          <div class="detail-box">
            <p><strong>Request #${data.requestId}</strong></p>
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Priority:</strong> ${data.priority.charAt(0).toUpperCase() + data.priority.slice(1)}</p>
            <p><strong>Category:</strong> ${data.category.charAt(0).toUpperCase() + data.category.slice(1)}</p>
            <p><strong>Description:</strong><br>${data.description}</p>
          </div>

          <p>You'll receive notifications as we update your request status. You can track progress anytime in your tenant portal.</p>

          <center>
            <a href="${data.portalUrl}" class="button">View Request Status</a>
          </center>

          <p>If this is an emergency, please call our emergency maintenance line immediately.</p>
        </div>
        <div class="footer">
          <p>Next Level Rentals<br>
          <a href="${data.portalUrl}">Tenant Portal</a> | <a href="tel:+15552019110">Emergency: (555) 201-9110</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${data.tenantName},

We've received your maintenance request and will address it as soon as possible.

Request #${data.requestId}
Title: ${data.title}
Priority: ${data.priority}
Category: ${data.category}
Description: ${data.description}

You'll receive notifications as we update your request status.

View your request: ${data.portalUrl}

If this is an emergency, please call our emergency maintenance line at (555) 201-9110.

- Next Level Rentals
  `;

  return { html, text };
}

interface StatusChangeData {
  tenantName: string;
  requestId: string;
  title: string;
  oldStatus: MaintenanceStatus;
  newStatus: MaintenanceStatus;
  adminName?: string;
  portalUrl: string;
}

export function statusChangeEmail(data: StatusChangeData): { html: string; text: string } {
  const statusLabels: Record<MaintenanceStatus, string> = {
    submitted: 'Submitted',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };

  const statusClass = `status-${data.newStatus}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Request Status Updated</h1>
        </div>
        <div class="content">
          <h2>Hi ${data.tenantName},</h2>
          <p>Your maintenance request status has been updated.</p>

          <div class="detail-box">
            <p><strong>Request #${data.requestId}</strong></p>
            <p><strong>Title:</strong> ${data.title}</p>
            <p>
              <strong>Status:</strong>
              <span class="status-badge ${statusClass}">${statusLabels[data.newStatus]}</span>
            </p>
            ${data.adminName ? `<p><strong>Updated by:</strong> ${data.adminName}</p>` : ''}
          </div>

          ${data.newStatus === 'in_progress' ? `
            <p>Great news! We're actively working on your request. Our team will keep you updated on progress.</p>
          ` : ''}

          ${data.newStatus === 'completed' ? `
            <p>Your maintenance request has been completed! If you have any issues or concerns, please don't hesitate to reach out.</p>
          ` : ''}

          ${data.newStatus === 'cancelled' ? `
            <p>Your maintenance request has been cancelled. If you have any questions, please contact your property manager.</p>
          ` : ''}

          <center>
            <a href="${data.portalUrl}" class="button">View Full Details</a>
          </center>
        </div>
        <div class="footer">
          <p>Next Level Rentals<br>
          <a href="${data.portalUrl}">Tenant Portal</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${data.tenantName},

Your maintenance request status has been updated.

Request #${data.requestId}
Title: ${data.title}
New Status: ${statusLabels[data.newStatus]}
${data.adminName ? `Updated by: ${data.adminName}` : ''}

View full details: ${data.portalUrl}

- Next Level Rentals
  `;

  return { html, text };
}

interface NotesAddedData {
  tenantName: string;
  requestId: string;
  title: string;
  adminName: string;
  notes: string;
  portalUrl: string;
}

export function notesAddedEmail(data: NotesAddedData): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>New Update on Your Request</h1>
        </div>
        <div class="content">
          <h2>Hi ${data.tenantName},</h2>
          <p>${data.adminName} has added an update to your maintenance request.</p>

          <div class="detail-box">
            <p><strong>Request #${data.requestId}</strong></p>
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Update from ${data.adminName}:</strong><br>${data.notes}</p>
          </div>

          <center>
            <a href="${data.portalUrl}" class="button">View Request</a>
          </center>
        </div>
        <div class="footer">
          <p>Next Level Rentals<br>
          <a href="${data.portalUrl}">Tenant Portal</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${data.tenantName},

${data.adminName} has added an update to your maintenance request.

Request #${data.requestId}
Title: ${data.title}

Update from ${data.adminName}:
${data.notes}

View request: ${data.portalUrl}

- Next Level Rentals
  `;

  return { html, text };
}

interface TechnicianScheduledData {
  tenantName: string;
  requestId: string;
  title: string;
  scheduledDate: string;
  scheduledTime?: string;
  technicianName?: string;
  portalUrl: string;
}

export function technicianScheduledEmail(data: TechnicianScheduledData): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Technician Scheduled</h1>
        </div>
        <div class="content">
          <h2>Hi ${data.tenantName},</h2>
          <p>We've scheduled a technician to address your maintenance request.</p>

          <div class="detail-box">
            <p><strong>Request #${data.requestId}</strong></p>
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Scheduled Date:</strong> ${data.scheduledDate}</p>
            ${data.scheduledTime ? `<p><strong>Time:</strong> ${data.scheduledTime}</p>` : ''}
            ${data.technicianName ? `<p><strong>Technician:</strong> ${data.technicianName}</p>` : ''}
          </div>

          <p>Please ensure someone is available to provide access if needed. If this time doesn't work for you, please contact us as soon as possible to reschedule.</p>

          <center>
            <a href="${data.portalUrl}" class="button">View Request Details</a>
          </center>
        </div>
        <div class="footer">
          <p>Next Level Rentals<br>
          <a href="${data.portalUrl}">Tenant Portal</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${data.tenantName},

We've scheduled a technician to address your maintenance request.

Request #${data.requestId}
Title: ${data.title}
Scheduled Date: ${data.scheduledDate}
${data.scheduledTime ? `Time: ${data.scheduledTime}` : ''}
${data.technicianName ? `Technician: ${data.technicianName}` : ''}

Please ensure someone is available to provide access if needed.

View request: ${data.portalUrl}

- Next Level Rentals
  `;

  return { html, text };
}

interface NewRequestAdminData {
  tenantName: string;
  tenantEmail: string;
  requestId: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  propertyName?: string;
  unit?: string;
  adminPortalUrl: string;
}

export function newRequestAdminEmail(data: NewRequestAdminData): { html: string; text: string } {
  const priorityColors: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    emergency: '#dc2626'
  };

  const priorityColor = priorityColors[data.priority] || '#6b7280';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
      <style>
        .priority-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: ${priorityColor};
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>New Maintenance Request</h1>
        </div>
        <div class="content">
          <h2>New Request Submitted</h2>
          <p>A tenant has submitted a new maintenance request that requires attention.</p>

          <div class="detail-box">
            <p><strong>Request #${data.requestId}</strong></p>
            <p><strong>Tenant:</strong> ${data.tenantName} (${data.tenantEmail})</p>
            ${data.propertyName ? `<p><strong>Property:</strong> ${data.propertyName}</p>` : ''}
            ${data.unit ? `<p><strong>Unit:</strong> ${data.unit}</p>` : ''}
            <p><strong>Title:</strong> ${data.title}</p>
            <p>
              <strong>Priority:</strong>
              <span class="priority-indicator"></span>
              ${data.priority.charAt(0).toUpperCase() + data.priority.slice(1)}
            </p>
            <p><strong>Category:</strong> ${data.category.charAt(0).toUpperCase() + data.category.slice(1)}</p>
            <p><strong>Description:</strong><br>${data.description}</p>
          </div>

          ${data.priority === 'emergency' || data.priority === 'high' ? `
            <p style="color: #dc2626; font-weight: 600;">⚠️ This is a ${data.priority} priority request and requires immediate attention.</p>
          ` : ''}

          <center>
            <a href="${data.adminPortalUrl}" class="button">Review Request</a>
          </center>
        </div>
        <div class="footer">
          <p>Next Level Rentals - Admin Portal<br>
          <a href="${data.adminPortalUrl}">View All Requests</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
New Maintenance Request Submitted

Request #${data.requestId}
Tenant: ${data.tenantName} (${data.tenantEmail})
${data.propertyName ? `Property: ${data.propertyName}` : ''}
${data.unit ? `Unit: ${data.unit}` : ''}
Title: ${data.title}
Priority: ${data.priority}
Category: ${data.category}

Description:
${data.description}

${data.priority === 'emergency' || data.priority === 'high' ? '⚠️ HIGH PRIORITY - Requires immediate attention' : ''}

Review request: ${data.adminPortalUrl}

- Next Level Rentals Admin Portal
  `;

  return { html, text };
}
