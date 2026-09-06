import UploadFiles from '@/components/common/UploadFiles';
import PrivateFile from '@/components/common/PrivateFile';
import Head from 'next/head';
import { useState, useRef } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import LoadingState from '@/components/common/LoadingState';
import Card from '@/components/common/Card';
import { useAuth } from '@/context/AuthContext';
import { useLandlordData } from '@/hooks/useLandlordData';
import { landlordUtils } from '@/lib/firebase-utils';
import type { LandlordExpense } from '@/types/schema';
import type { NextPageWithAuth } from '../_app';

const EXPENSE_TYPES = [
    { value: 'maintenance', label: 'Maintenance & Repairs' },
    { value: 'utility', label: 'Utilities (Water/Trash/Power)' },
    { value: 'insurance', label: 'Property Insurance' },
    { value: 'tax', label: 'Property Taxes' },
    { value: 'capital_improvement', label: 'Capital Improvements' },
    { value: 'other', label: 'Other' }
];

const LandlordExpensesPage: NextPageWithAuth = () => {
    const { user } = useAuth();
    const { properties, expenses, loading, error, refresh } = useLandlordData();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const operation = useRef('');
    const [fileIds, setFileIds] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [filterProperty, setFilterProperty] = useState<string>('all');

    // Form state
    const [propertyId, setPropertyId] = useState('');
    const [expenseType, setExpenseType] = useState('maintenance');
    const [category, setCategory] = useState('Plumbing');
    const [vendor, setVendor] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [taxDeductible, setTaxDeductible] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSubmitExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!propertyId) {
            setErrorMsg('Please select a property');
            return;
        }
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setErrorMsg('Please enter a valid expense amount');
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);
        try {
            operation.current ||= crypto.randomUUID();
            const response = await fetch('/api/landlord/expense', { method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
                body: JSON.stringify({ operationId: operation.current, propertyId, expenseType, category, vendor,
                    amount: numericAmount, description, date, invoiceNumber, taxDeductible, fileIds }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || result.error || 'Unable to save expense');
            operation.current = '';
            setFileIds([]);

            await refresh().catch(() => setErrorMsg('Expense saved. Refresh the list to see it.'));
            setIsModalOpen(false);
            // Reset form
            setAmount('');
            setVendor('');
            setDescription('');
            setInvoiceNumber('');
        } catch (err: any) {
            console.error('Failed to create expense:', err);
            setErrorMsg(err.message || 'Failed to submit expense');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredExpenses = expenses.filter(e => {
        if (filterProperty === 'all') return true;
        return e.propertyId === filterProperty;
    });

    const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    if (error) return <LandlordLayout title="Owner records unavailable"><p role="alert">{error} <button onClick={refresh}>Retry</button></p></LandlordLayout>;

    return (
        <LandlordLayout title="Expenses & Invoices">
            <Head>
                <title>Expenses & Invoices - Owner Portal</title>
            </Head>

            <div className="expenses-container">
                <div className="page-header">
                    <div>
                        <h1>Expenses & Invoices</h1>
                        <p>Track maintenance costs, capital expenditures, taxes, and vendor receipts.</p>
                    </div>

                    <button
                        type="button"
                        disabled={loading || !properties.some(p => !p.archived)}
                        onClick={() => {
                            if (properties.length > 0 && !propertyId) {
                                setPropertyId(properties.find(p => !p.archived)!.id);
                            }
                            setIsModalOpen(true);
                        }}
                        className="primary-button"
                    >
                        + Log New Expense
                    </button>
                </div>

                {/* Filter and Summary Bar */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6 bg-surface p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-400 font-medium">Filter by Property:</label>
                        <select
                            value={filterProperty}
                            onChange={(e) => setFilterProperty(e.target.value)}
                            className="bg-surface-elevated border border-border text-white text-sm rounded-lg px-3 py-1.5"
                        >
                            <option value="all">All Properties ({properties.length})</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <span className="text-sm text-gray-400 mr-2">Total Logged:</span>
                        <span className="text-xl font-extrabold text-red-400">${totalExpenseAmount.toLocaleString()}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-8">
                        <LoadingState message="Loading your logged expenses..." />
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <div className="empty-box">
                        <p className="text-gray-400 mb-3">No expenses recorded for this filter.</p>
                        <button
                            type="button"
                            onClick={() => {
                                if (properties.length > 0 && !propertyId) setPropertyId(properties.find(p => !p.archived)!.id);
                                setIsModalOpen(true);
                            }}
                            className="outline-button text-sm"
                        >
                            Log Your First Expense
                        </button>
                    </div>
                ) : (
                    <Card title={`Expense Records (${filteredExpenses.length})`}>
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Property</th>
                                        <th>Category</th>
                                        <th>Vendor</th>
                                        <th>Description</th>
                                        <th>Status</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses.map((expense) => {
                                        const propName = properties.find(p => p.id === expense.propertyId)?.name || 'Property';
                                        return (
                                            <tr key={expense.id}>
                                                <td className="whitespace-nowrap">
                                                    {expense.date ? new Date(expense.date as string).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="font-semibold text-white">{propName}</td>
                                                <td>
                                                    <span className="tag tag--neutral capitalize">
                                                        {expense.category || expense.expenseType}
                                                    </span>
                                                </td>
                                                <td>{expense.vendor || 'Independent'}</td>
                                                <td className="text-gray-300 max-w-xs truncate">{expense.description}{expense.fileIds?.map(id => <PrivateFile key={id} id={id} />)}</td>
                                                <td>
                                                    <span className={`tag ${expense.status === 'approved' || expense.status === 'paid' ? 'tag--success' : 'tag--warning'}`}>
                                                        {expense.status}
                                                    </span>
                                                </td>
                                                <td className="font-bold text-red-400">-${(expense.amount || 0).toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Add Expense Modal */}
                {isModalOpen && (
                    <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
                        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Log Property Expense</h3>
                                <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
                            </div>

                            <form onSubmit={handleSubmitExpense} className="space-y-4 p-6">
                                <UploadFiles kind="expense" propertyId={propertyId} ids={fileIds} onChange={setFileIds} onBusy={setUploading} />
                                {errorMsg && (
                                    <div className="p-3 bg-red-900/30 border border-red-800 text-red-400 text-sm rounded">
                                        {errorMsg}
                                    </div>
                                )}

                                <div>
                                    <label className="input-label">Select Property *</label>
                                    <select
                                        value={propertyId}
                                        onChange={(e) => setPropertyId(e.target.value)}
                                        required
                                        className="form-input"
                                    >
                                        <option value="" disabled>Select property...</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="input-label">Expense Type *</label>
                                        <select
                                            value={expenseType}
                                            onChange={(e) => setExpenseType(e.target.value)}
                                            className="form-input"
                                        >
                                            {EXPENSE_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="input-label">Category</label>
                                        <input
                                            type="text"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            placeholder="e.g. Plumbing, HVAC, Taxes"
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="input-label">Vendor / Payee</label>
                                        <input
                                            type="text"
                                            value={vendor}
                                            onChange={(e) => setVendor(e.target.value)}
                                            placeholder="e.g. Apex Electric LLC"
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">Amount ($) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="input-label">Date of Expense</label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">Invoice / Receipt #</label>
                                        <input
                                            type="text"
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value)}
                                            placeholder="Optional invoice #"
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="input-label">Description / Scope of Work</label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe the repair or cost incurred..."
                                        className="form-input"
                                        required
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="taxDed"
                                        checked={taxDeductible}
                                        onChange={(e) => setTaxDeductible(e.target.checked)}
                                        className="h-4 w-4 accent-primary"
                                    />
                                    <label htmlFor="taxDed" className="text-sm text-gray-300">
                                        Tax Deductible Operating Expense
                                    </label>
                                </div>

                                <div className="modal-actions pt-4 border-t border-border flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="ghost-button"
                                        onClick={() => setIsModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || uploading}
                                        className="primary-button"
                                    >
                                        {submitting ? 'Saving...' : 'Record Expense'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .expenses-container {
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

                .modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.75);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    padding: 1rem;
                }

                .modal-card {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    width: 100%;
                    max-width: 540px;
                    overflow: hidden;
                    box-shadow: var(--shadow-xl);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid var(--color-border);
                }

                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--color-text);
                }

                .close-btn {
                    background: transparent;
                    border: none;
                    color: var(--color-muted);
                    font-size: 1.25rem;
                    cursor: pointer;
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
                    background: var(--color-surface-elevated);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    color: var(--color-text);
                    font-size: 0.875rem;
                }

                .form-input:focus {
                    outline: none;
                    border-color: var(--color-primary);
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

LandlordExpensesPage.requireAuth = true;
LandlordExpensesPage.allowedRoles = ['landlord', 'admin', 'super-admin'];

export default LandlordExpensesPage;
