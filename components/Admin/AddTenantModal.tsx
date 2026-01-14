import { useState } from 'react';

type AddTenantModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function AddTenantModal({ isOpen, onClose, onSuccess }: AddTenantModalProps) {
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [propertyId, setPropertyId] = useState(''); // Could be a select
    const [unit, setUnit] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/create-tenant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    displayName,
                    propertyId,
                    unit,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to create tenant');
            }

            // Success
            alert(`Tenant created! Temporary Password: ${data.tempPassword}`);
            onSuccess();
            onClose();

            // Reset form
            setEmail('');
            setDisplayName('');
            setUnit('');
            setPropertyId('');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <header className="modal__header">
                    <h2>Add New Tenant</h2>
                    <button className="close-button" onClick={onClose} type="button">×</button>
                </header>

                <form onSubmit={handleSubmit} className="modal__form">
                    <div className="form-group">
                        <label htmlFor="displayName">Full Name</label>
                        <input
                            id="displayName"
                            type="text"
                            required
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="e.g. Jane Doe"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="e.g. jane@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="property">Property</label>
                        <select
                            id="property"
                            required
                            value={propertyId}
                            onChange={e => setPropertyId(e.target.value)}
                        >
                            <option value="">Select Property...</option>
                            <option value="test-property-1">Lakeside Apartments</option>
                            <option value="aurora-lofts">Aurora Lofts</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="unit">Unit Number</label>
                        <input
                            id="unit"
                            type="text"
                            required
                            value={unit}
                            onChange={e => setUnit(e.target.value)}
                            placeholder="e.g. 101B"
                        />
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    <div className="form-actions">
                        <button type="button" className="ghost-button" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary-button" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Tenant'}
                        </button>
                    </div>
                </form>
            </div>

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
        }

        .modal {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .modal__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .modal__header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .modal__form {
          display: grid;
          gap: 1rem;
        }

        .form-group {
          display: grid;
          gap: 0.5rem;
        }

        label {
          font-weight: 600;
          font-size: 0.9rem;
        }

        input, select {
          padding: 0.75rem;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 1rem;
        }

        .error-message {
          color: red;
          font-size: 0.9rem;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }
      `}</style>
        </div>
    );
}
