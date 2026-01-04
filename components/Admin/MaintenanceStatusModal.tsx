import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/stripe-client';
import type { MaintenanceRequest, MaintenanceStatus } from '@/types/maintenance';

interface MaintenanceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: MaintenanceRequest;
}

export default function MaintenanceStatusModal({
  isOpen,
  onClose,
  onSuccess,
  request
}: MaintenanceStatusModalProps) {
  const [status, setStatus] = useState<MaintenanceStatus>(request.status);
  const [adminNotes, setAdminNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus(request.status);
      setAdminNotes('');
      setScheduledDate('');
      setScheduledTime('');
      setTechnicianName('');
      setError(null);
    }
  }, [isOpen, request]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();

      const response = await fetch('/api/admin/update-maintenance-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: request.id,
          status,
          adminNotes: adminNotes || undefined,
          scheduledDate: scheduledDate || undefined,
          scheduledTime: scheduledTime || undefined,
          technicianName: technicianName || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update request');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const time = typeof timestamp === 'number' ? timestamp : timestamp.seconds * 1000;
    return new Date(time).toLocaleString();
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return 'priority-emergency';
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Update Maintenance Request</h2>
          <button className="close-button" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <div className="modal__details">
          <h3>{request.title}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Request ID:</span>
              <span className="detail-value">{request.id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Priority:</span>
              <span className={`priority-badge ${getPriorityBadgeClass(request.priority)}`}>
                {request.priority}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Category:</span>
              <span className="detail-value">{request.category}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Submitted:</span>
              <span className="detail-value">{formatDate(request.createdAt)}</span>
            </div>
          </div>
          <div className="description-section">
            <span className="detail-label">Description:</span>
            <p className="description-text">{request.description}</p>
          </div>
          {request.adminNotes && (
            <div className="notes-section">
              <span className="detail-label">Previous Notes:</span>
              <p className="notes-text">{request.adminNotes}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="modal__form">
          <div className="form-group">
            <label htmlFor="status">Status *</label>
            <select
              id="status"
              required
              value={status}
              onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
            >
              <option value="submitted">Submitted</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="adminNotes">Add Notes</label>
            <textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add updates or notes for the tenant..."
              rows={4}
            />
            <span className="form-hint">
              These notes will be visible to the tenant and trigger a notification.
            </span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="scheduledDate">Scheduled Date</label>
              <input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="scheduledTime">Scheduled Time</label>
              <input
                id="scheduledTime"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="technicianName">Technician Name</label>
            <input
              id="technicianName"
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="Enter technician name..."
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="form-actions">
            <button
              type="button"
              className="outline-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Updating & Notifying...' : 'Update & Notify Tenant'}
            </button>
          </div>
        </form>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            padding: 1rem;
          }

          .modal {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 700px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }

          .modal__header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #e2e8f0;
          }

          .modal__header h2 {
            margin: 0;
            font-size: 1.5rem;
            color: #1e293b;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: #94a3b8;
            padding: 0;
            line-height: 1;
          }

          .close-button:hover {
            color: #64748b;
          }

          .modal__details {
            padding: 1.5rem 2rem;
            background-color: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
          }

          .modal__details h3 {
            margin: 0 0 1rem;
            font-size: 1.25rem;
            color: #1e293b;
          }

          .detail-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .detail-item {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .detail-label {
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.05em;
          }

          .detail-value {
            font-size: 0.938rem;
            color: #1e293b;
          }

          .priority-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.813rem;
            font-weight: 600;
            text-transform: capitalize;
            width: fit-content;
          }

          .priority-emergency {
            background-color: #fee2e2;
            color: #991b1b;
          }

          .priority-high {
            background-color: #fef3c7;
            color: #92400e;
          }

          .priority-medium {
            background-color: #dbeafe;
            color: #1e40af;
          }

          .priority-low {
            background-color: #d1fae5;
            color: #065f46;
          }

          .description-section,
          .notes-section {
            margin-top: 1rem;
          }

          .description-text,
          .notes-text {
            margin: 0.5rem 0 0;
            padding: 0.75rem;
            background: white;
            border-radius: 6px;
            color: #475569;
            line-height: 1.6;
            font-size: 0.938rem;
          }

          .modal__form {
            padding: 2rem;
            display: grid;
            gap: 1.5rem;
          }

          .form-group {
            display: grid;
            gap: 0.5rem;
          }

          .form-row {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          label {
            font-weight: 600;
            font-size: 0.938rem;
            color: #1e293b;
          }

          input,
          select,
          textarea {
            padding: 0.75rem;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 0.938rem;
            color: #1e293b;
            font-family: inherit;
          }

          input:focus,
          select:focus,
          textarea:focus {
            outline: none;
            border-color: var(--color-primary, #6c5ce7);
            box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
          }

          textarea {
            resize: vertical;
          }

          .form-hint {
            font-size: 0.813rem;
            color: #94a3b8;
          }

          .error-message {
            color: #dc2626;
            font-size: 0.875rem;
            padding: 0.75rem;
            background: #fee2e2;
            border-radius: 6px;
            margin: 0;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e2e8f0;
          }

          .outline-button,
          .primary-button {
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 0.938rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .outline-button {
            background: white;
            border: 1px solid #cbd5e1;
            color: #475569;
          }

          .outline-button:hover:not(:disabled) {
            border-color: #94a3b8;
            background-color: #f8fafc;
          }

          .primary-button {
            background-color: var(--color-primary, #6c5ce7);
            color: white;
            border: none;
          }

          .primary-button:hover:not(:disabled) {
            background-color: var(--color-primary-dark, #5b4bc9);
            transform: translateY(-1px);
          }

          .outline-button:disabled,
          .primary-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          @media (max-width: 640px) {
            .detail-grid,
            .form-row {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
