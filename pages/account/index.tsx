import NotificationSettings from '@/components/Portal/NotificationSettings';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import SiteLayout from '@/components/Layout/SiteLayout';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import AdminLayout from '@/components/Admin/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import type { NextPageWithAuth } from '../_app';
import type { EmergencyContact, VehicleInfo, PetInfo } from '@/types/schema';

type AccountTab = 'profile' | 'vehicles' | 'pets' | 'payments' | 'notifications';



function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const ICON = {
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  car: 'M5 17h14M6 17l1.5-5h9L18 17M5 17v2h2v-2M17 17v2h2v-2M8 12l1-3h6l1 3',
  paw: 'M12 21c-3 0-5-2-5-4s2-3 5-3 5 1 5 3-2 4-5 4zM6 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  card: 'M3 5h18v14H3zM3 10h18',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  bank: 'M3 10h18M5 10v9M19 10v9M9 10v9M15 10v9M3 19h18M12 3l9 7H3z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
};

const AccountPage: NextPageWithAuth = () => {
  const { user, profile, role, refreshProfile } = useAuth();
  const audience: 'tenant' | 'landlord' | 'admin' = role === 'landlord' ? 'landlord' : role === 'admin' || role === 'super-admin' ? 'admin' : 'tenant';
  const Shell = audience === 'landlord' ? LandlordLayout : audience === 'admin' ? AdminLayout : SiteLayout;
  const copy = {
    tenant: {
      eyebrow: 'Tenant portal · Account',
      sub: 'Manage profile details, emergency contacts, parking permits, and preferences.',
      profileTab: 'Profile & Emergency',
      profileSub: 'Official records associated with your lease agreement.',
      nameFallback: 'Resident',
      contactTitle: 'Emergency Contact',
      contactSub: 'Designated contact for urgent safety or emergency entry situations.',
      contactEmpty: 'No emergency contact registered yet.',
      contactAdd: 'Add Emergency Contact',
    },
    landlord: {
      eyebrow: 'Owner portal · Account',
      sub: 'Your contact details and how we reach you about your homes and payouts.',
      profileTab: 'Profile & contact',
      profileSub: 'How the office reaches you about your homes, statements and payouts.',
      nameFallback: 'Owner',
      contactTitle: 'Backup contact',
      contactSub: 'Someone we can reach if we cannot get hold of you about an urgent repair at one of your homes.',
      contactEmpty: 'No backup contact on file yet.',
      contactAdd: 'Add backup contact',
    },
    admin: {
      eyebrow: role === 'super-admin' ? 'Super admin · Account' : 'Admin · Account',
      sub: 'Your contact details and notification preferences.',
      profileTab: 'Profile & contact',
      profileSub: 'Your staff contact details.',
      nameFallback: 'Staff',
      contactTitle: 'Backup contact',
      contactSub: 'Someone the office can reach if you are unavailable.',
      contactEmpty: 'No backup contact on file yet.',
      contactAdd: 'Add backup contact',
    },
  }[audience];
  const homesCount = profile?.propertyIds?.length ?? 0;
  const [activeTab, setActiveTab] = useState<AccountTab>('profile');

  // Edit Profile Modal state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmergency, setEditEmergency] = useState<EmergencyContact>({
    name: '',
    relationship: '',
    phone: '',
    email: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Vehicle Modal state
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState<VehicleInfo>({
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    color: '',
    licensePlate: '',
    state: 'TX',
  });
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Pet Modal state
  const [isAddPetOpen, setIsAddPetOpen] = useState(false);
  const [newPet, setNewPet] = useState<PetInfo>({
    name: '',
    type: 'dog',
    breed: '',
    weight: '25',
  });
  const [savingPet, setSavingPet] = useState(false);

  // Saved Payment Methods state
  const [savedMethods, setSavedMethods] = useState<Array<{ id: string; type: 'ach' | 'card'; label: string; last4: string; isDefault: boolean }>>([
  ]);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'ach' | 'card'>('ach');
  const [pmBankName, setPmBankName] = useState('');
  const [pmLast4, setPmLast4] = useState('');

  // Populate local form fields when profile loads
  useEffect(() => {
    if (profile) {
      setEditName(profile.displayName || '');
      setEditPhone(profile.phoneNumber || '');
      if (profile.emergencyContact) {
        setEditEmergency(profile.emergencyContact);
      }
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/tenant/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: editName,
          phoneNumber: editPhone,
          emergencyContact: editEmergency,
        }),
      });

      if (!res.ok) throw new Error('Failed to update profile');
      await refreshProfile();
      setIsEditProfileOpen(false);
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingVehicle(true);

    try {
      const token = await user.getIdToken();
      const currentVehicles = profile?.vehicles || [];
      const updatedVehicles = [...currentVehicles, newVehicle];

      const res = await fetch('/api/tenant/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicles: updatedVehicles,
        }),
      });

      if (!res.ok) throw new Error('Failed to add vehicle');
      await refreshProfile();
      setNewVehicle({
        make: '',
        model: '',
        year: new Date().getFullYear().toString(),
        color: '',
        licensePlate: '',
        state: 'TX',
      });
      setIsAddVehicleOpen(false);
    } catch (err) {
      console.error('Error adding vehicle:', err);
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleRemoveVehicle = async (index: number) => {
    if (!user) return;
    const currentVehicles = profile?.vehicles || [];
    const updatedVehicles = currentVehicles.filter((_, i) => i !== index);

    try {
      const token = await user.getIdToken();
      await fetch('/api/tenant/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicles: updatedVehicles,
        }),
      });
      await refreshProfile();
    } catch (err) {
      console.error('Error removing vehicle:', err);
    }
  };

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingPet(true);

    try {
      const token = await user.getIdToken();
      const currentPets = profile?.pets || [];
      const updatedPets = [...currentPets, newPet];

      const res = await fetch('/api/tenant/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pets: updatedPets,
        }),
      });

      if (!res.ok) throw new Error('Failed to add pet');
      await refreshProfile();
      setNewPet({
        name: '',
        type: 'dog',
        breed: '',
        weight: '25',
      });
      setIsAddPetOpen(false);
    } catch (err) {
      console.error('Error adding pet:', err);
    } finally {
      setSavingPet(false);
    }
  };

  const handleRemovePet = async (index: number) => {
    if (!user) return;
    const currentPets = profile?.pets || [];
    const updatedPets = currentPets.filter((_, i) => i !== index);

    try {
      const token = await user.getIdToken();
      await fetch('/api/tenant/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pets: updatedPets,
        }),
      });
      await refreshProfile();
    } catch (err) {
      console.error('Error removing pet:', err);
    }
  };

  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    const newPm = {
      id: `pm_${Date.now()}`,
      type: paymentType,
      label: paymentType === 'ach' ? `${pmBankName || 'Bank Account'}` : 'Credit Card',
      last4: pmLast4.slice(-4) || '1234',
      isDefault: savedMethods.length === 0,
    };
    setSavedMethods((prev) => [...prev, newPm]);
    setIsAddPaymentOpen(false);
    setPmBankName('');
    setPmLast4('');
  };

  const handleRemovePaymentMethod = (id: string) => {
    setSavedMethods((prev) => prev.filter((pm) => pm.id !== id));
  };

  return (
    <Shell title="Account" footer="compact">
      <Head>
        <title>Account Settings - Next Level Rentals</title>
      </Head>

      <div className={audience === 'tenant' ? 'owner-page account-page account-page--site' : 'owner-page account-page'}>
        <div>
          <div className="owner-page__head">
            <div>
              <p className="section-eyebrow">{copy.eyebrow}</p>
              <h1>Account Settings</h1>
              <p className="owner-page__sub">{copy.sub}</p>
            </div>
          </div>

          <div className="account-grid-layout">
            {/* Sidebar Navigation */}
            <aside>
              <nav className="account-nav" aria-label="Account sections">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`account-nav__item${activeTab === 'profile' ? ' account-nav__item--active' : ''}`} aria-current={activeTab === 'profile' ? 'page' : undefined}
                >
                  <Icon d={ICON.user} /> {copy.profileTab}
                </button>

                {role === 'tenant' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('vehicles')}
                      className={`account-nav__item${activeTab === 'vehicles' ? ' account-nav__item--active' : ''}`} aria-current={activeTab === 'vehicles' ? 'page' : undefined}
                    >
                      <Icon d={ICON.car} /> Vehicles & Parking
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('pets')}
                      className={`account-nav__item${activeTab === 'pets' ? ' account-nav__item--active' : ''}`} aria-current={activeTab === 'pets' ? 'page' : undefined}
                    >
                      <Icon d={ICON.paw} /> Registered Pets
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('payments')}
                      className={`account-nav__item${activeTab === 'payments' ? ' account-nav__item--active' : ''}`} aria-current={activeTab === 'payments' ? 'page' : undefined}
                    >
                      <Icon d={ICON.card} /> Payment Methods
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className={`account-nav__item${activeTab === 'notifications' ? ' account-nav__item--active' : ''}`} aria-current={activeTab === 'notifications' ? 'page' : undefined}
                >
                  <Icon d={ICON.bell} /> Notifications
                </button>
              </nav>
            </aside>

            {/* Main Content Pane */}
            <main className="owner-card account-page__main">
              {activeTab === 'profile' && (
                <div className="account-pane">
                  <div className="owner-card__head">
                    <div>
                      <h2>Personal Information</h2>
                      <p className="owner-note">{copy.profileSub}</p>
                    </div>
                    <button type="button" className="owner-small-button owner-small-button--primary" onClick={() => setIsEditProfileOpen(true)}>
                      Edit Profile
                    </button>
                  </div>

                  <div className="owner-page__stats">
                    <div className="stat-card">
                      <div className="stat-card__label">Full Legal Name</div>
                      <div className="stat-card__value stat-card__value--text">{profile?.displayName || copy.nameFallback}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card__label">Email Address</div>
                      <div className="stat-card__value stat-card__value--text">{user?.email}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card__label">Contact Phone</div>
                      <div className="stat-card__value stat-card__value--text">{profile?.phoneNumber || 'Not provided'}</div>
                    </div>
                    {audience === 'tenant' ? (
                      <div className="stat-card">
                        <div className="stat-card__label">Unit / Apartment</div>
                        <div className="stat-card__value stat-card__value--text">{profile?.unit || 'Assigned via Lease'}</div>
                      </div>
                    ) : audience === 'landlord' ? (
                      <div className="stat-card">
                        <div className="stat-card__label">Homes we manage for you</div>
                        <div className="stat-card__value stat-card__value--text">{homesCount > 0 ? (homesCount === 1 ? '1 home' : homesCount + ' homes') : 'See My Properties'}</div>
                      </div>
                    ) : (
                      <div className="stat-card">
                        <div className="stat-card__label">Access level</div>
                        <div className="stat-card__value stat-card__value--text">{role === 'super-admin' ? 'Super admin' : 'Admin'}</div>
                      </div>
                    )}
                  </div>

                  {/* Emergency / backup contact */}
                  <div className="account-pane__section">
                    <div className="owner-card__head">
                      <div>
                        <h2>{copy.contactTitle}</h2>
                        <p className="owner-note">{copy.contactSub}</p>
                      </div>
                      {profile?.emergencyContact?.name ? (
                        <button type="button" className="owner-small-button" onClick={() => setIsEditProfileOpen(true)}>Edit</button>
                      ) : null}
                    </div>

                    {profile?.emergencyContact?.name ? (
                      <div className="owner-kv">
                        <div><span>Contact name</span><span>{profile.emergencyContact.name}</span></div>
                        <div><span>Relationship</span><span>{profile.emergencyContact.relationship || 'Emergency contact'}</span></div>
                        <div><span>Phone</span><span>{profile.emergencyContact.phone}</span></div>
                        <div><span>Email</span><span>{profile.emergencyContact.email || 'Not provided'}</span></div>
                      </div>
                    ) : (
                      <>
                        <p className="owner-empty">{copy.contactEmpty}</p>
                        <div>
                          <button type="button" className="owner-small-button" onClick={() => setIsEditProfileOpen(true)}>
                            {copy.contactAdd}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Vehicles & Parking Tab */}
              {activeTab === 'vehicles' && (
                <div className="account-pane">
                  <div className="owner-card__head">
                    <div>
                      <h2>Registered Vehicles & Parking</h2>
                      <p className="owner-note">Register vehicles to prevent towing and ensure authorized resident parking permits.</p>
                    </div>
                    <button type="button" className="owner-small-button owner-small-button--primary" onClick={() => setIsAddVehicleOpen(true)}>
                      Register vehicle
                    </button>
                  </div>

                  {(!profile?.vehicles || profile.vehicles.length === 0) ? (
                    <>
                      <p className="owner-empty">No vehicles registered. Add your vehicle make, model and license plate so property security recognizes your car.</p>
                      <div>
                        <button type="button" className="owner-small-button" onClick={() => setIsAddVehicleOpen(true)}>Register new vehicle</button>
                      </div>
                    </>
                  ) : (
                    <ul className="owner-list">
                      {profile.vehicles.map((v, idx) => (
                        <li key={idx}>
                          <span className="owner-list__icon" aria-hidden="true"><Icon d={ICON.car} /></span>
                          <div className="owner-list__text">
                            <strong>{[v.year, v.make, v.model].filter(Boolean).join(' ')}</strong>
                            <span>Plate {v.licensePlate}{v.state ? ` (${v.state})` : ''} · {v.color || 'Color not recorded'}</span>
                          </div>
                          <span className="tag tag--success">Permit active</span>
                          <button type="button" className="owner-small-button" onClick={() => handleRemoveVehicle(idx)}>Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Pets Tab */}
              {activeTab === 'pets' && (
                <div className="account-pane">
                  <div className="owner-card__head">
                    <div>
                      <h2>Registered Household Pets</h2>
                      <p className="owner-note">Keep every pet on your lease file so maintenance staff can enter safely.</p>
                    </div>
                    <button type="button" className="owner-small-button owner-small-button--primary" onClick={() => setIsAddPetOpen(true)}>
                      Register pet
                    </button>
                  </div>

                  {(!profile?.pets || profile.pets.length === 0) ? (
                    <>
                      <p className="owner-empty">No pets registered. If you have dogs, cats or service animals, register them here.</p>
                      <div>
                        <button type="button" className="owner-small-button" onClick={() => setIsAddPetOpen(true)}>Register pet</button>
                      </div>
                    </>
                  ) : (
                    <ul className="owner-list">
                      {profile.pets.map((pet, idx) => (
                        <li key={idx}>
                          <span className="owner-list__icon" aria-hidden="true"><Icon d={ICON.paw} /></span>
                          <div className="owner-list__text">
                            <strong>{pet.name}</strong>
                            <span>{[pet.type, pet.breed, pet.weight ? `${pet.weight} lbs` : ''].filter(Boolean).join(' · ')}</span>
                          </div>
                          <span className="tag tag--neutral">Approved</span>
                          <button type="button" className="owner-small-button" onClick={() => handleRemovePet(idx)}>Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Payment Methods Tab */}
              {activeTab === 'payments' && (
                <div className="account-pane">
                  <div className="owner-card__head">
                    <div>
                      <h2>Saved Payment Methods</h2>
                      <p className="owner-note">Online payments and saved payment methods are unavailable. Contact management for payment instructions.</p>
                    </div>
                    <button type="button" className="owner-small-button owner-small-button--primary" disabled>
                      Add payment method
                    </button>
                  </div>

                  {savedMethods.length === 0 ? (
                    <p className="owner-empty">No saved payment methods. Rent is paid by the methods the office gives you until online payments open.</p>
                  ) : (
                    <ul className="owner-list">
                      {savedMethods.map((pm) => (
                        <li key={pm.id}>
                          <span className="owner-list__icon" aria-hidden="true"><Icon d={pm.type === 'ach' ? ICON.bank : ICON.card} /></span>
                          <div className="owner-list__text">
                            <strong>{pm.label}</strong>
                            <span>Ending in {pm.last4} · {pm.type === 'ach' ? 'ACH direct debit' : 'Card'}</span>
                          </div>
                          {pm.isDefault && <span className="tag tag--info">Default</span>}
                          <button type="button" className="owner-small-button" onClick={() => handleRemovePaymentMethod(pm.id)}>Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === 'notifications' && <NotificationSettings audience={audience} />}
            </main>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--overlay-background)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Personal & Emergency Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Emergency Contact Information</h4>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Contact Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Doe"
                      value={editEmergency.name}
                      onChange={(e) => setEditEmergency({ ...editEmergency, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-background)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Relationship
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Spouse, Parent"
                        value={editEmergency.relationship}
                        onChange={(e) => setEditEmergency({ ...editEmergency, relationship: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-background)',
                          color: 'var(--color-text)',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Emergency Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="(555) 000-0000"
                        value={editEmergency.phone}
                        onChange={(e) => setEditEmergency({ ...editEmergency, phone: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-background)',
                          color: 'var(--color-text)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setIsEditProfileOpen(false)}
                  disabled={savingProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isAddVehicleOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--overlay-background)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Register Resident Vehicle</h3>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVehicle} style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Make *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Honda"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Civic"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Year
                  </label>
                  <input
                    type="text"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Color
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Silver"
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    License Plate *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC-1234"
                    value={newVehicle.licensePlate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    State
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="TX"
                    value={newVehicle.state}
                    onChange={(e) => setNewVehicle({ ...newVehicle, state: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  disabled={savingVehicle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingVehicle}
                >
                  {savingVehicle ? 'Registering...' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Pet Modal */}
      {isAddPetOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--overlay-background)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Register Resident Pet</h3>
              <button
                type="button"
                onClick={() => setIsAddPetOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPet} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Pet Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cooper"
                  value={newPet.name}
                  onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Type *
                  </label>
                  <select
                    value={newPet.type}
                    onChange={(e) => setNewPet({ ...newPet, type: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="bird">Bird</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Breed
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Golden Retriever"
                    value={newPet.breed}
                    onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Approximate Weight (lbs)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 45"
                  value={newPet.weight}
                  onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setIsAddPetOpen(false)}
                  disabled={savingPet}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingPet}
                >
                  {savingPet ? 'Registering...' : 'Register Pet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {isAddPaymentOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--overlay-background)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Add Payment Method</h3>
              <button
                type="button"
                onClick={() => setIsAddPaymentOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPaymentMethod} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Method Type
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="paymentType"
                      checked={paymentType === 'ach'}
                      onChange={() => setPaymentType('ach')}
                    />
                    <span>ACH Bank Account (0% Fee)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="paymentType"
                      checked={paymentType === 'card'}
                      onChange={() => setPaymentType('card')}
                    />
                    <span>Debit / Credit Card</span>
                  </label>
                </div>
              </div>

              {paymentType === 'ach' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Bank / Institution Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chase, Bank of America, Wells Fargo"
                      value={pmBankName}
                      onChange={(e) => setPmBankName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-background)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Routing & Account Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Account number ending in..."
                      value={pmLast4}
                      onChange={(e) => setPmLast4(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-background)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Card Number (16 Digits)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="4000 1234 5678 9010"
                    value={pmLast4}
                    onChange={(e) => setPmLast4(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setIsAddPaymentOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                >
                  Save Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .account-pane {
          display: grid;
          gap: 1.5rem;
        }
        .account-pane :global(.owner-card__head) {
          align-items: flex-start;
        }
        .account-pane :global(.owner-card__head h2) {
          margin: 0 0 0.25rem;
          font-size: 1.25rem;
        }
        .account-pane__section {
          display: grid;
          gap: 1rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--color-border);
        }
        .account-pane :global(.owner-page__stats) {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .account-pane :global(.stat-card__value--text) {
          font-size: 1.05rem;
          overflow-wrap: anywhere;
        }
        .account-grid-layout {
          display: grid;
          grid-template-columns: 240px minmax(0, 1fr);
          gap: 2rem;
          align-items: start;
        }
        @media (max-width: 768px) {
          .account-grid-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Shell>
  );
};

AccountPage.requireAuth = true;

export default AccountPage;
