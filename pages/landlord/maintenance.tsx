import Head from 'next/head';
import { useState } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import LoadingState from '@/components/common/LoadingState';
import Card from '@/components/common/Card';
import MaintenanceRequests from '@/components/Portal/MaintenanceRequests';
import { useLandlordData } from '@/hooks/useLandlordData';
import type { NextPageWithAuth } from '../_app';

type MaintenanceStatusFilter = 'Open' | 'In Progress' | 'Resolved' | 'All';

const LandlordMaintenanceOversightPage: NextPageWithAuth = () => {
    const { maintenanceRequests, properties, loading, error, refresh } = useLandlordData();
    const [statusFilter, setStatusFilter] = useState<MaintenanceStatusFilter>('All');
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');

    const filtered = maintenanceRequests.filter((req) => {
        if (selectedPropertyId !== 'all' && req.propertyId !== selectedPropertyId) {
            return false;
        }
        return true;
    });

    const openCount = maintenanceRequests.filter(r => r.status === 'submitted').length;
    const inProgressCount = maintenanceRequests.filter(r => r.status === 'in_progress').length;
    const resolvedCount = maintenanceRequests.filter(r => r.status === 'completed').length;

    if (error) return <LandlordLayout title="Owner records unavailable"><p role="alert">{error} <button onClick={refresh}>Retry</button></p></LandlordLayout>;

    return (
        <LandlordLayout title="Maintenance Oversight">
            <Head>
                <title>Maintenance Oversight - Owner Portal</title>
            </Head>

            <div className="maintenance-container">
                <div className="page-header">
                    <div>
                        <h1>Maintenance Oversight</h1>
                        <p>Real-time repair requests, technician assignments, and work order costs.</p>
                    </div>

                    <div className="flex gap-2">
                        <span className="tag tag--neutral">Open: {openCount}</span>
                        <span className="tag tag--info">In Progress: {inProgressCount}</span>
                        <span className="tag tag--success">Resolved: {resolvedCount}</span>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-surface p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-400 font-medium">Filter by Property:</label>
                        <select
                            value={selectedPropertyId}
                            onChange={(e) => setSelectedPropertyId(e.target.value)}
                            className="bg-surface-elevated border border-border text-white text-sm rounded-lg px-3 py-1.5"
                        >
                            <option value="all">All Properties ({properties.length})</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="p-8">
                        <LoadingState message="Loading work orders..." />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-box">
                        <p className="text-gray-400">No maintenance tickets reported for this selection.</p>
                    </div>
                ) : (
                    <MaintenanceRequests
                        requests={filtered}
                        activeStatus={statusFilter}
                        onStatusChange={setStatusFilter}
                    />
                )}
            </div>

            <style jsx>{`
                .maintenance-container {
                    padding: 2rem;
                    max-width: var(--max-width);
                    margin: 0 auto;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                h1 {
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--color-text);
                    margin: 0 0 0.25rem;
                }

                p {
                    color: var(--color-muted);
                    margin: 0;
                }

                .empty-box {
                    text-align: center;
                    padding: 4rem 2rem;
                    background: var(--color-surface);
                    border: 1px dashed var(--color-border);
                    border-radius: var(--radius-lg);
                }
            `}</style>
        </LandlordLayout>
    );
};

LandlordMaintenanceOversightPage.requireAuth = true;
LandlordMaintenanceOversightPage.allowedRoles = ['landlord', 'admin', 'super-admin'];

export default LandlordMaintenanceOversightPage;
