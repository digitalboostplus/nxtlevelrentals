import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/Admin/AdminLayout';
import MaintenanceStatusModal from '@/components/Admin/MaintenanceStatusModal';
import { useAuth } from '@/context/AuthContext';
import { getMaintenanceRequests } from '@/lib/maintenance';
import type { MaintenanceRequest, MaintenanceStatus } from '@/types/maintenance';
import type { NextPageWithAuth } from '../_app';

type FilterType = 'all' | MaintenanceStatus;

const AdminMaintenancePage: NextPageWithAuth = () => {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);



  const fetchRequests = useCallback(async () => {
    if (!user || !profile) return;

    setLoading(true);

    try {
      const data = await getMaintenanceRequests(user.uid, profile.role || 'admin');
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch maintenance requests:', error);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile) {
      fetchRequests();
    }
  }, [user, profile, fetchRequests]);

  const filteredRequests =
    filter === 'all'
      ? requests
      : requests.filter((req) => req.status === filter);

  const handleRequestClick = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
  };

  const handleModalClose = () => {
    setSelectedRequest(null);
  };

  const handleModalSuccess = () => {
    fetchRequests();
  };

  const getStatusBadgeClass = (status: MaintenanceStatus) => {
    switch (status) {
      case 'submitted':
        return 'status-submitted';
      case 'in_progress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
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

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const time = typeof timestamp === 'number' ? timestamp : timestamp.seconds * 1000;
    return new Date(time).toLocaleDateString();
  };

  const statusCounts = {
    all: requests.length,
    submitted: requests.filter((r) => r.status === 'submitted').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    cancelled: requests.filter((r) => r.status === 'cancelled').length
  };

  return (
    <AdminLayout title="Maintenance Requests">
      <Head>
        <title>Maintenance Requests - Admin - Next Level Rentals</title>
      </Head>

      <div className="page-header">
        <h1>Maintenance Requests</h1>
        <p>Manage and respond to tenant maintenance requests</p>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({statusCounts.all})
        </button>
        <button
          className={`filter-tab ${filter === 'submitted' ? 'active' : ''}`}
          onClick={() => setFilter('submitted')}
        >
          Submitted ({statusCounts.submitted})
        </button>
        <button
          className={`filter-tab ${filter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilter('in_progress')}
        >
          In Progress ({statusCounts.in_progress})
        </button>
        <button
          className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({statusCounts.completed})
        </button>
        <button
          className={`filter-tab ${filter === 'cancelled' ? 'active' : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          Cancelled ({statusCounts.cancelled})
        </button>
      </div>

      <div className="requests-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔧</span>
            <h3>No requests found</h3>
            <p>
              {filter === 'all'
                ? 'No maintenance requests have been submitted yet.'
                : `No ${filter.replace('_', ' ')} requests.`}
            </p>
          </div>
        ) : (
          <div className="requests-table">
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Priority</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="request-info">
                        <strong>{request.title}</strong>
                        <span className="request-id">ID: {request.id}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`priority-badge ${getPriorityBadgeClass(request.priority)}`}>
                        {request.priority}
                      </span>
                    </td>
                    <td>{request.category}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{formatDate(request.createdAt)}</td>
                    <td>
                      <button
                        className="action-button"
                        onClick={() => handleRequestClick(request)}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRequest && (
        <MaintenanceStatusModal
          isOpen={true}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          request={selectedRequest}
        />
      )}

      <style jsx>{`
        .page-header {
          padding: 2rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .page-header h1 {
          margin: 0 0 0.5rem;
          font-size: 2rem;
          color: #1e293b;
        }

        .page-header p {
          margin: 0;
          color: #64748b;
          font-size: 1rem;
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          padding: 1rem 2rem;
          border-bottom: 2px solid #e2e8f0;
          overflow-x: auto;
        }

        .filter-tab {
          padding: 0.75rem 1.25rem;
          background: none;
          border: none;
          font-size: 0.938rem;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .filter-tab:hover {
          color: #334155;
        }

        .filter-tab.active {
          color: var(--color-primary, #6c5ce7);
          border-bottom-color: var(--color-primary, #6c5ce7);
        }

        .requests-content {
          padding: 2rem;
          min-height: 400px;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e2e8f0;
          border-top-color: var(--color-primary, #6c5ce7);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem;
          color: #475569;
          font-size: 1.25rem;
        }

        .empty-state p {
          margin: 0;
          color: #94a3b8;
        }

        .requests-table {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        thead {
          background-color: #f8fafc;
        }

        th {
          text-align: left;
          padding: 1rem;
          font-size: 0.813rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        td {
          padding: 1rem;
          border-top: 1px solid #e2e8f0;
          font-size: 0.938rem;
          color: #475569;
        }

        .request-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .request-info strong {
          color: #1e293b;
        }

        .request-id {
          font-size: 0.813rem;
          color: #94a3b8;
        }

        .status-badge,
        .priority-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.813rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-submitted {
          background-color: #dbeafe;
          color: #1e40af;
        }

        .status-in-progress {
          background-color: #fef3c7;
          color: #92400e;
        }

        .status-completed {
          background-color: #d1fae5;
          color: #065f46;
        }

        .status-cancelled {
          background-color: #fee2e2;
          color: #991b1b;
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

        .action-button {
          padding: 0.5rem 1rem;
          background-color: var(--color-primary, #6c5ce7);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button:hover {
          background-color: var(--color-primary-dark, #5b4bc9);
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .requests-table {
            font-size: 0.875rem;
          }

          th,
          td {
            padding: 0.75rem 0.5rem;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

AdminMaintenancePage.requireAuth = true;
AdminMaintenancePage.allowedRoles = ['admin', 'super-admin'];

export default AdminMaintenancePage;
