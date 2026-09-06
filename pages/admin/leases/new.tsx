import UploadFiles from '@/components/common/UploadFiles';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import Card from '@/components/common/Card';
import { propertyUtils, adminUtils } from '@/lib/firebase-utils';
import { useAuth } from '@/context/AuthContext';
import type { Property } from '@/types/schema';
import type { NextPageWithAuth } from '../../_app';

const NewLeaseWizardPage: NextPageWithAuth = () => {
    const router = useRouter();
    const { user } = useAuth();
    const operationId = useRef('');
    const [activation, setActivation] = useState<{ leaseId: string; accountSetupUrl: string | null } | null>(null);
    const { propertyId: initialPropertyId } = router.query;

    const [properties, setProperties] = useState<Property[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Form fields
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
    const [unit, setUnit] = useState<string>('');
    const [tenantType, setTenantType] = useState<'existing' | 'new'>('existing');
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');
    const [newTenantName, setNewTenantName] = useState<string>('');
    const [newTenantEmail, setNewTenantEmail] = useState<string>('');
    const [newTenantPhone, setNewTenantPhone] = useState<string>('');

    const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState<string>(() => {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear.toISOString().slice(0, 10);
    });
    const [monthlyRent, setMonthlyRent] = useState<number>(1500);
    const [securityDeposit, setSecurityDeposit] = useState<number>(1500);
    const [paymentDueDay, setPaymentDueDay] = useState<number>(1);
    const [lateFeeGraceDays, setLateFeeGraceDays] = useState<number>(5);
    const [lateFeeAmount, setLateFeeAmount] = useState<number>(50);
    const [fileIds, setFileIds] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [props, tens] = await Promise.all([
                    propertyUtils.getAllProperties(),
                    adminUtils.getAllTenants()
                ]);
                setProperties(props.filter(p => !p.archived) as unknown as Property[]);
                setTenants(tens || []);

                if (initialPropertyId) {
                    const match = props.find(p => p.id === initialPropertyId && !p.archived);
                    if (match) {
                        setSelectedPropertyId(match.id || '');
                        if (match.rent) setMonthlyRent(match.rent);
                        if (match.defaultRentAmount) setMonthlyRent(match.defaultRentAmount);
                        if (match.rent) setSecurityDeposit(match.rent);
                    }
                } else if (props.some(p => !p.archived)) {
                    const first = props.find(p => !p.archived)!;
                    setSelectedPropertyId(first.id || '');
                    if (first.rent) setMonthlyRent(first.rent);
                }

                if (tens.length > 0) {
                    setSelectedTenantId(tens[0].id);
                }
            } catch (err) {
                console.error('Failed to load lease wizard prerequisites:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [initialPropertyId]);

    const handlePropertyChange = (pId: string) => {
        setSelectedPropertyId(pId);
        setUnit('');
        const prop = properties.find(p => p.id === pId);
        if (prop) {
            const rent = prop.rent || prop.defaultRentAmount || 1500;
            setMonthlyRent(rent);
            setSecurityDeposit(rent);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPropertyId) {
            setErrorMsg('Please select a property.');
            return;
        }

        if (!user) return;
        setSubmitting(true);
        setErrorMsg(null);
        try {
            if (!operationId.current) operationId.current = crypto.randomUUID();
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/activate-lease', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    operationId: operationId.current, propertyId: selectedPropertyId,
                    unitId: unit || undefined,
                    ...(tenantType === 'existing' ? { tenantId: selectedTenantId } : {
                        newTenant: { displayName: newTenantName, email: newTenantEmail, phoneNumber: newTenantPhone }
                    }),
                    startDate, endDate, monthlyRent: Number(monthlyRent), securityDeposit: Number(securityDeposit),
                    paymentDueDay: Number(paymentDueDay), lateFeeGraceDays: Number(lateFeeGraceDays),
                    lateFeeAmount: Number(lateFeeAmount), fileIds
                })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Lease activation failed');
            setActivation(result);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to activate lease');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminLayout title="Create Lease Agreement">
            <Head>
                <title>Create Lease Agreement - Admin Operations</title>
            </Head>

            <div className="wizard-container">
                <div className="page-header">
                    <div>
                        <h1>Create Lease Agreement</h1>
                        <p>Assign a tenant to a unit and activate the lease. Initial rent is prorated by calendar day through month end.</p>
                    </div>
                </div>

                {activation ? (
                    <Card title="Lease activated">
                        <p>The lease, assignments and initial charges were saved together.</p>
                        {tenantType === 'new' && (activation.accountSetupUrl ? (
                            <p>Account setup link (share securely with the resident): <a href={activation.accountSetupUrl}>Set password</a></p>
                        ) : <p>Account created. Request a password reset link before handing over access.</p>)}
                        <button type="button" onClick={() => router.push(`/admin/properties/${selectedPropertyId}`)}>View property</button>
                    </Card>
                ) : loading ? (
                    <div className="p-8 text-center text-gray-400">
                        Loading lease wizard data...
                    </div>
                ) : (
                    <Card title="Lease Contract Configuration">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <fieldset disabled={submitting || uploading} style={{ border: 0, padding: 0, margin: 0 }}>
                            {errorMsg && (
                                <div className="p-3 bg-red-900/40 border border-red-800 text-red-400 text-sm rounded">
                                    {errorMsg}
                                </div>
                            )}

                            {/* Property & Unit Selection */}
                            <div className="section-block">
                                <h3 className="section-title">1. Property & Unit Assignment</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="input-label">Select Property *</label>
                                        <select
                                            value={selectedPropertyId}
                                            onChange={(e) => handlePropertyChange(e.target.value)}
                                            required
                                            className="form-input"
                                        >
                                            {properties.filter(p => !p.archived).map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.status})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="input-label">Property Unit</label>
                                        <select value={unit} onChange={e => setUnit(e.target.value)} className="form-input">
                                            <option value="">{properties.find(p => p.id === selectedPropertyId)?.units?.length ? 'Select a unit' : 'Entire property'}</option>
                                            {properties.find(p => p.id === selectedPropertyId)?.units?.filter(u => !u.archived).map(u => <option key={u.id} value={u.id}>{u.unitNumber} ({u.status})</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Tenant Assignment */}
                            <div className="section-block">
                                <h3 className="section-title">2. Resident Assignment</h3>
                                <div className="flex gap-4 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input
                                            type="radio"
                                            name="tenantType"
                                            checked={tenantType === 'existing'}
                                            onChange={() => setTenantType('existing')}
                                        />
                                        <span>Existing Resident</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input
                                            type="radio"
                                            name="tenantType"
                                            checked={tenantType === 'new'}
                                            onChange={() => setTenantType('new')}
                                        />
                                        <span>Add New Resident</span>
                                    </label>
                                </div>

                                {tenantType === 'existing' ? (
                                    <div>
                                        <label className="input-label">Select Existing Resident *</label>
                                        <select
                                            value={selectedTenantId}
                                            onChange={(e) => setSelectedTenantId(e.target.value)}
                                            className="form-input"
                                            required
                                        >
                                            {tenants.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.displayName || t.fullName || 'Resident'} ({t.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="input-label">Full Name *</label>
                                            <input
                                                type="text"
                                                value={newTenantName}
                                                onChange={(e) => setNewTenantName(e.target.value)}
                                                placeholder="e.g. Jane Smith"
                                                className="form-input"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="input-label">Email Address *</label>
                                            <input
                                                type="email"
                                                value={newTenantEmail}
                                                onChange={(e) => setNewTenantEmail(e.target.value)}
                                                placeholder="jane@example.com"
                                                className="form-input"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="input-label">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={newTenantPhone}
                                                onChange={(e) => setNewTenantPhone(e.target.value)}
                                                placeholder="(555) 000-0000"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Financial Terms */}
                            <div className="section-block">
                                <h3 className="section-title">3. Lease Dates & Financial Terms</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="input-label">Lease Start Date *</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">Lease End Date *</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">Monthly Rent ($) *</label>
                                        <input
                                            type="number"
                                            value={monthlyRent}
                                            onChange={(e) => setMonthlyRent(Number(e.target.value))}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">Security Deposit ($) *</label>
                                        <input
                                            type="number"
                                            value={securityDeposit}
                                            onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <div>
                                        <label className="input-label">Rent Due Day of Month</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={paymentDueDay}
                                            onChange={(e) => setPaymentDueDay(Number(e.target.value))}
                                            className="form-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">Late Fee Grace Period (Days)</label>
                                        <input
                                            type="number"
                                            value={lateFeeGraceDays}
                                            onChange={(e) => setLateFeeGraceDays(Number(e.target.value))}
                                            className="form-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">Late Fee Amount ($)</label>
                                        <input
                                            type="number"
                                            value={lateFeeAmount}
                                            onChange={(e) => setLateFeeAmount(Number(e.target.value))}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Document Attachment */}
                            <div className="section-block">
                                <h3 className="section-title">4. Executed Lease Agreement (PDF)</h3>
                                <div>
                                    <UploadFiles kind="lease" propertyId={selectedPropertyId} ids={fileIds} onChange={setFileIds} onBusy={setUploading} />
                                    <span className="text-xs text-gray-500 mt-1 block">
                                        Residents will be able to view and download this contract directly from their portal.
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="ghost-button"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || uploading}
                                    className="primary-button"
                                >
                                    {submitting ? 'Creating Lease & Ledger...' : 'Execute & Activate Lease'}
                                </button>
                            </div>
                            </fieldset>
                        </form>
                    </Card>
                )}
            </div>

            <style jsx>{`
                .wizard-container {
                    padding: 2rem;
                    max-width: var(--max-width);
                    margin: 0 auto;
                }

                .page-header {
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

                .section-block {
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--color-border);
                }

                .section-title {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: var(--color-text);
                    margin: 0 0 1rem;
                }

                .input-label {
                    display: block;
                    font-size: 0.813rem;
                    font-weight: 600;
                    color: var(--color-text-secondary);
                    margin-bottom: 0.35rem;
                }

                .form-input {
                    width: 100%;
                    padding: 0.65rem 0.85rem;
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    color: var(--color-text);
                    font-size: 0.875rem;
                }

                .form-input:focus {
                    outline: none;
                    border-color: var(--color-primary);
                }
            `}</style>
        </AdminLayout>
    );
};

NewLeaseWizardPage.requireAuth = true;
NewLeaseWizardPage.allowedRoles = ['admin', 'super-admin'];

export default NewLeaseWizardPage;
