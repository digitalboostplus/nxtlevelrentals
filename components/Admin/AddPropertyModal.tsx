import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { landlordUtils, storageUtils } from '@/lib/firebase-utils';
import { propertyAmenities } from '@/data/amenities';
import type { Landlord } from '@/lib/firebase-utils';

type AddPropertyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddPropertyModal({ isOpen, onClose, onSuccess }: AddPropertyModalProps) {
  const { user } = useAuth();

  // Basic Info
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  // Property Details
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [squareFeet, setSquareFeet] = useState(500);
  const [rent, setRent] = useState(0);

  // Status & Management
  const [available, setAvailable] = useState(true);
  const [landlordId, setLandlordId] = useState('');
  const [managementStatus, setManagementStatus] = useState<'active' | 'inactive' | 'pending'>('active');

  // Images
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState('');

  // Landlords list
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [loadingLandlords, setLoadingLandlords] = useState(false);

  // Form state
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch landlords when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLandlords();
    }
  }, [isOpen]);

  const fetchLandlords = async () => {
    setLoadingLandlords(true);
    try {
      const data = await landlordUtils.getActiveLandlords();
      setLandlords(data);
    } catch (err) {
      console.error('Failed to fetch landlords:', err);
    } finally {
      setLoadingLandlords(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Add new files to existing
    setSelectedImages(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const preview = URL.createObjectURL(file);
      setImagePreviews(prev => [...prev, preview]);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      // Revoke the object URL to free memory
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handle amenity toggle
  const toggleAmenity = (amenityLabel: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityLabel)
        ? prev.filter(a => a !== amenityLabel)
        : [...prev, amenityLabel]
    );
  };

  const addCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (trimmed && !selectedAmenities.includes(trimmed)) {
      setSelectedAmenities(prev => [...prev, trimmed]);
      setCustomAmenity('');
    }
  };

  // Reset form
  const resetForm = () => {
    setName('');
    setAddress('');
    setDescription('');
    setBedrooms(1);
    setBathrooms(1);
    setSquareFeet(500);
    setRent(0);
    setAvailable(true);
    setLandlordId('');
    setManagementStatus('active');
    setSelectedImages([]);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews([]);
    setSelectedAmenities([]);
    setCustomAmenity('');
    setError(null);
    setUploadProgress(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // 1. Upload images first
      const imageUrls: string[] = [];

      if (selectedImages.length > 0) {
        const totalImages = selectedImages.length;

        for (let i = 0; i < selectedImages.length; i++) {
          const file = selectedImages[i];
          const timestamp = Date.now();
          const path = `properties/temp-${timestamp}/images/${timestamp}_${file.name}`;
          const url = await storageUtils.uploadFile(file, path);
          imageUrls.push(url);
          setUploadProgress(Math.round(((i + 1) / totalImages) * 50)); // 50% for uploads
        }
      }

      // 2. Get auth token
      const token = await user.getIdToken();

      // 3. Get landlord name if selected
      const selectedLandlord = landlords.find(l => l.id === landlordId);

      // 4. Submit to API
      setUploadProgress(75);

      const res = await fetch('/api/admin/create-property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          address,
          description,
          bedrooms,
          bathrooms,
          squareFeet,
          rent,
          available,
          landlordId: landlordId || null,
          landlordName: selectedLandlord ? `${selectedLandlord.firstName} ${selectedLandlord.lastName}` : null,
          managementStatus,
          amenities: selectedAmenities,
          images: imageUrls,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create property');
      }

      setUploadProgress(100);

      // Success
      resetForm();
      onSuccess();
      onClose();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <header className="modal__header">
          <h2>Add New Property</h2>
          <button className="close-button" onClick={handleClose} type="button" disabled={loading}>X</button>
        </header>

        <form onSubmit={handleSubmit} className="modal__form">
          {/* Basic Info Section */}
          <section className="form-section">
            <h3>Basic Information</h3>

            <div className="form-group">
              <label htmlFor="name">Property Name *</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Lakeside Apartments Unit 101"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address *</label>
              <input
                id="address"
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g. 123 Main St, Austin, TX 78701"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the property features, location highlights, etc."
                disabled={loading}
              />
            </div>
          </section>

          {/* Property Details Section */}
          <section className="form-section">
            <h3>Property Details</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bedrooms">Bedrooms *</label>
                <input
                  id="bedrooms"
                  type="number"
                  required
                  min={1}
                  value={bedrooms}
                  onChange={e => setBedrooms(parseInt(e.target.value) || 1)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bathrooms">Bathrooms *</label>
                <input
                  id="bathrooms"
                  type="number"
                  required
                  min={1}
                  step={0.5}
                  value={bathrooms}
                  onChange={e => setBathrooms(parseFloat(e.target.value) || 1)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="squareFeet">Sq Ft *</label>
                <input
                  id="squareFeet"
                  type="number"
                  required
                  min={1}
                  value={squareFeet}
                  onChange={e => setSquareFeet(parseInt(e.target.value) || 1)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="rent">Monthly Rent ($) *</label>
              <input
                id="rent"
                type="number"
                required
                min={0}
                step={0.01}
                value={rent}
                onChange={e => setRent(parseFloat(e.target.value) || 0)}
                disabled={loading}
              />
            </div>
          </section>

          {/* Status & Management Section */}
          <section className="form-section">
            <h3>Status & Management</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="available">Availability</label>
                <div className="toggle-group">
                  <input
                    id="available"
                    type="checkbox"
                    checked={available}
                    onChange={e => setAvailable(e.target.checked)}
                    disabled={loading}
                  />
                  <span>{available ? 'Available' : 'Occupied'}</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="managementStatus">Management Status</label>
                <select
                  id="managementStatus"
                  value={managementStatus}
                  onChange={e => setManagementStatus(e.target.value as 'active' | 'inactive' | 'pending')}
                  disabled={loading}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="landlord">Property Owner (Landlord)</label>
              <select
                id="landlord"
                value={landlordId}
                onChange={e => setLandlordId(e.target.value)}
                disabled={loading || loadingLandlords}
              >
                <option value="">No landlord assigned</option>
                {landlords.map(landlord => (
                  <option key={landlord.id} value={landlord.id}>
                    {landlord.firstName} {landlord.lastName}
                    {landlord.businessName ? ` (${landlord.businessName})` : ''}
                  </option>
                ))}
              </select>
              {loadingLandlords && <small>Loading landlords...</small>}
            </div>
          </section>

          {/* Images Section */}
          <section className="form-section">
            <h3>Property Images</h3>

            <div className="form-group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                disabled={loading}
              />
              <button
                type="button"
                className="outline-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                + Add Images
              </button>
            </div>

            {imagePreviews.length > 0 && (
              <div className="image-previews">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="image-preview">
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      sizes="100px"
                      className="preview-image"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                    <button
                      type="button"
                      className="remove-image"
                      onClick={() => removeImage(index)}
                      disabled={loading}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Amenities Section */}
          <section className="form-section">
            <h3>Amenities</h3>

            <div className="amenities-grid">
              {propertyAmenities.map(amenity => (
                <label key={amenity.id} className="amenity-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(amenity.label)}
                    onChange={() => toggleAmenity(amenity.label)}
                    disabled={loading}
                  />
                  <span>{amenity.label}</span>
                </label>
              ))}
            </div>

            <div className="custom-amenity">
              <input
                type="text"
                placeholder="Add custom amenity..."
                value={customAmenity}
                onChange={e => setCustomAmenity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
                disabled={loading}
              />
              <button
                type="button"
                onClick={addCustomAmenity}
                disabled={loading || !customAmenity.trim()}
              >
                Add
              </button>
            </div>

            {selectedAmenities.filter(a => !propertyAmenities.some(pa => pa.label === a)).length > 0 && (
              <div className="custom-amenities-list">
                <small>Custom amenities:</small>
                {selectedAmenities
                  .filter(a => !propertyAmenities.some(pa => pa.label === a))
                  .map(amenity => (
                    <span key={amenity} className="custom-amenity-tag">
                      {amenity}
                      <button type="button" onClick={() => toggleAmenity(amenity)}>X</button>
                    </span>
                  ))}
              </div>
            )}
          </section>

          {/* Progress & Error */}
          {loading && uploadProgress > 0 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              <span>{uploadProgress < 50 ? 'Uploading images...' : 'Creating property...'}</span>
            </div>
          )}

          {error && <p className="error-message">{error}</p>}

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="ghost-button" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Creating...' : 'Create Property'}
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
          padding: 1rem;
        }

        .modal {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .modal__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          position: sticky;
          top: 0;
          background: white;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
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
          color: #6b7280;
        }

        .close-button:hover {
          color: #111827;
        }

        .modal__form {
          display: grid;
          gap: 1.5rem;
        }

        .form-section {
          display: grid;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .form-section:last-of-type {
          border-bottom: none;
        }

        .form-section h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #374151;
        }

        .form-group {
          display: grid;
          gap: 0.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }

        label {
          font-weight: 600;
          font-size: 0.9rem;
          color: #374151;
        }

        input, select, textarea {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          font-family: inherit;
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: var(--color-primary, #6366f1);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        input:disabled, select:disabled, textarea:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .toggle-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .toggle-group input {
          width: 20px;
          height: 20px;
        }

        /* Image Previews */
        .image-previews {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .image-preview {
          position: relative;
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }

        :global(.preview-image) {
          object-fit: cover;
        }

        .remove-image {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-image:hover {
          background: rgba(0, 0, 0, 0.8);
        }

        /* Amenities */
        .amenities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 0.5rem;
        }

        .amenity-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: normal;
          cursor: pointer;
        }

        .amenity-checkbox input {
          width: 18px;
          height: 18px;
        }

        .custom-amenity {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .custom-amenity input {
          flex: 1;
        }

        .custom-amenity button {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
        }

        .custom-amenity button:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .custom-amenities-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
          margin-top: 0.5rem;
        }

        .custom-amenity-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #e0e7ff;
          color: #3730a3;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .custom-amenity-tag button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          color: #3730a3;
        }

        /* Progress Bar */
        .progress-bar {
          position: relative;
          height: 24px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--color-primary, #6366f1);
          transition: width 0.3s ease;
        }

        .progress-bar span {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.75rem;
          color: #374151;
        }

        .error-message {
          color: #dc2626;
          font-size: 0.9rem;
          background: #fef2f2;
          padding: 0.75rem;
          border-radius: 6px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .outline-button {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .outline-button:hover:not(:disabled) {
          background: #f9fafb;
        }

        .ghost-button {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #6b7280;
          font-weight: 500;
        }

        .ghost-button:hover:not(:disabled) {
          color: #111827;
        }

        .primary-button {
          padding: 0.75rem 1.5rem;
          background: var(--color-primary, #6366f1);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .primary-button:hover:not(:disabled) {
          opacity: 0.9;
        }

        .primary-button:disabled,
        .ghost-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

