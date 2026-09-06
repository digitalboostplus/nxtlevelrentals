import NotificationSettings from '@/components/Portal/NotificationSettings';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import SiteLayout from '@/components/Layout/SiteLayout';
import { useAuth } from '@/context/AuthContext';
import type { NextPageWithAuth } from '../_app';
import type { EmergencyContact, VehicleInfo, PetInfo } from '@/types/schema';

type AccountTab = 'profile' | 'vehicles' | 'pets' | 'payments' | 'notifications';



const AccountPage: NextPageWithAuth = () => {
  const { user, profile, role, refreshProfile } = useAuth();
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
    <SiteLayout>
      <Head>
        <title>Resident Account Settings - Next Level Rentals</title>
      </Head>

      <div className="section section--full-height">
        <div className="section__inner">
          <div className="card__header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="card__title" style={{ fontSize: '2rem' }}>Account Settings</h1>
              <p style={{ color: 'var(--color-muted)', margin: 0 }}>Manage profile details, emergency contacts, parking permits, and preferences.</p>
            </div>
            <span className="tag tag--info capitalize">{role} Account</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem' }} className="account-grid-layout">
            {/* Sidebar Navigation */}
            <aside>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  style={{
                    textAlign: 'left',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: activeTab === 'profile' ? 'var(--color-primary)' : 'var(--color-border)',
                    background: activeTab === 'profile' ? 'rgba(79, 70, 229, 0.15)' : 'var(--color-surface)',
                    color: activeTab === 'profile' ? '#fff' : 'var(--color-text)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  👤 Profile & Emergency
                </button>

                {role === 'tenant' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('vehicles')}
                      style={{
                        textAlign: 'left',
                        padding: '0.85rem 1.25rem',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: activeTab === 'vehicles' ? 'var(--color-primary)' : 'var(--color-border)',
                        background: activeTab === 'vehicles' ? 'rgba(79, 70, 229, 0.15)' : 'var(--color-surface)',
                        color: activeTab === 'vehicles' ? '#fff' : 'var(--color-text)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      🚗 Vehicles & Parking
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('pets')}
                      style={{
                        textAlign: 'left',
                        padding: '0.85rem 1.25rem',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: activeTab === 'pets' ? 'var(--color-primary)' : 'var(--color-border)',
                        background: activeTab === 'pets' ? 'rgba(79, 70, 229, 0.15)' : 'var(--color-surface)',
                        color: activeTab === 'pets' ? '#fff' : 'var(--color-text)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      🐾 Registered Pets
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('payments')}
                      style={{
                        textAlign: 'left',
                        padding: '0.85rem 1.25rem',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: activeTab === 'payments' ? 'var(--color-primary)' : 'var(--color-border)',
                        background: activeTab === 'payments' ? 'rgba(79, 70, 229, 0.15)' : 'var(--color-surface)',
                        color: activeTab === 'payments' ? '#fff' : 'var(--color-text)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      💳 Payment Methods
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  style={{
                    textAlign: 'left',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: activeTab === 'notifications' ? 'var(--color-primary)' : 'var(--color-border)',
                    background: activeTab === 'notifications' ? 'rgba(79, 70, 229, 0.15)' : 'var(--color-surface)',
                    color: activeTab === 'notifications' ? '#fff' : 'var(--color-text)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  🔔 Notifications
                </button>
              </nav>
            </aside>

            {/* Main Content Pane */}
            <main style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              boxShadow: 'var(--shadow-md)',
            }}>
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Personal Information</h2>
                      <p style={{ color: 'var(--color-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>Official records associated with your lease agreement.</p>
                    </div>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setIsEditProfileOpen(true)}
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
                    >
                      Edit Profile
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Legal Name</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.35rem' }}>{profile?.displayName || 'Resident'}</div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.35rem' }}>{user?.email}</div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Phone</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.35rem' }}>{profile?.phoneNumber || 'Not provided'}</div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit / Apartment</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.35rem' }}>{profile?.unit || 'Assigned via Lease'}</div>
                    </div>
                  </div>

                  {/* Emergency Contact Section */}
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.75rem' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🚨 Emergency Contact</h3>
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                      Designated contact for urgent safety or emergency entry situations.
                    </p>

                    {profile?.emergencyContact?.name ? (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        padding: '1.25rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '1rem',
                      }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Contact Name</span>
                          <strong style={{ display: 'block', fontSize: '1rem' }}>{profile.emergencyContact.name}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Relationship</span>
                          <strong style={{ display: 'block', fontSize: '1rem' }}>{profile.emergencyContact.relationship || 'Emergency Contact'}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Phone</span>
                          <strong style={{ display: 'block', fontSize: '1rem' }}>{profile.emergencyContact.phone}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Email</span>
                          <strong style={{ display: 'block', fontSize: '1rem' }}>{profile.emergencyContact.email || 'N/A'}</strong>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '1.5rem',
                        borderRadius: '8px',
                        border: '1px dashed var(--color-border)',
                        textAlign: 'center',
                        color: 'var(--color-muted)',
                      }}>
                        <p style={{ margin: '0 0 0.75rem' }}>No emergency contact registered yet.</p>
                        <button
                          type="button"
                          className="outline-button"
                          onClick={() => setIsEditProfileOpen(true)}
                          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                          Add Emergency Contact
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vehicles & Parking Tab */}
              {activeTab === 'vehicles' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Registered Vehicles & Parking</h2>
                      <p style={{ color: 'var(--color-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                        Register vehicles to prevent towing and ensure authorized resident parking permits.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setIsAddVehicleOpen(true)}
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
                    >
                      + Register Vehicle
                    </button>
                  </div>

                  {(!profile?.vehicles || profile.vehicles.length === 0) ? (
                    <div style={{
                      padding: '2.5rem',
                      borderRadius: '8px',
                      border: '1px dashed var(--color-border)',
                      textAlign: 'center',
                      color: 'var(--color-muted)',
                    }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚗</div>
                      <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text)' }}>No Vehicles Registered</h3>
                      <p style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>
                        Add your vehicle make, model, and license plate number so property security recognizes your car.
                      </p>
                      <button
                        type="button"
                        className="outline-button"
                        onClick={() => setIsAddVehicleOpen(true)}
                      >
                        Register New Vehicle
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {profile.vehicles.map((v, idx) => (
                        <div key={idx} style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '10px',
                          padding: '1.25rem 1.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '1rem',
                        }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '8px',
                              background: 'rgba(79, 70, 229, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.3rem',
                            }}>
                              🚘
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{v.year} {v.make} {v.model}</h4>
                              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                                Plate: <strong style={{ color: 'var(--color-text)' }}>{v.licensePlate}</strong> {v.state ? `(${v.state})` : ''} • Color: {v.color || 'Standard'}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className="tag tag--success" style={{ fontSize: '0.75rem' }}>Permit Active</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveVehicle(idx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-error)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pets Tab */}
              {activeTab === 'pets' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Registered Household Pets</h2>
                      <p style={{ color: 'var(--color-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                        Ensure all pets are registered on your lease file in compliance with pet policies.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setIsAddPetOpen(true)}
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
                    >
                      + Register Pet
                    </button>
                  </div>

                  {(!profile?.pets || profile.pets.length === 0) ? (
                    <div style={{
                      padding: '2.5rem',
                      borderRadius: '8px',
                      border: '1px dashed var(--color-border)',
                      textAlign: 'center',
                      color: 'var(--color-muted)',
                    }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🐾</div>
                      <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text)' }}>No Pets Registered</h3>
                      <p style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>
                        If you have dogs, cats, or service animals, keep them registered so maintenance personnel can enter safely.
                      </p>
                      <button
                        type="button"
                        className="outline-button"
                        onClick={() => setIsAddPetOpen(true)}
                      >
                        Register Pet
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {profile.pets.map((pet, idx) => (
                        <div key={idx} style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '10px',
                          padding: '1.25rem 1.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '1rem',
                        }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '8px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.3rem',
                            }}>
                              {pet.type === 'cat' ? '🐱' : pet.type === 'dog' ? '🐶' : '🐾'}
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{pet.name}</h4>
                              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                                {pet.breed || 'Breed'} • {pet.type.toUpperCase()} • {pet.weight ? `${pet.weight} lbs` : 'Standard'}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className="tag tag--neutral" style={{ fontSize: '0.75rem' }}>Approved</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePet(idx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-error)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Methods Tab */}
              {activeTab === 'payments' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Saved Payment Methods</h2>
                      <p style={{ color: 'var(--color-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                        Online payments and saved payment methods are unavailable. Contact management for payment instructions.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="primary-button"
                      disabled
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
                    >
                      + Add Payment Method
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {savedMethods.map((pm) => (
                      <div key={pm.id} style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '8px',
                            background: pm.type === 'ach' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                          }}>
                            {pm.type === 'ach' ? '🏦' : '💳'}
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{pm.label}</h4>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                              Account ending in •••• {pm.last4} {pm.type === 'ach' ? '(ACH Direct Debit)' : '(Card)'}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {pm.isDefault && <span className="tag tag--info" style={{ fontSize: '0.75rem' }}>Default</span>}
                          <button
                            type="button"
                            onClick={() => handleRemovePaymentMethod(pm.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-error)',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && <NotificationSettings />}
            </main>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
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
                    background: 'rgba(255, 255, 255, 0.04)',
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
                    background: 'rgba(255, 255, 255, 0.04)',
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
                        background: 'rgba(255, 255, 255, 0.04)',
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
                          background: 'rgba(255, 255, 255, 0.04)',
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
                          background: 'rgba(255, 255, 255, 0.04)',
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
          background: 'rgba(0,0,0,0.75)',
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
                      background: 'rgba(255, 255, 255, 0.04)',
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
                      background: 'rgba(255, 255, 255, 0.04)',
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
                      background: 'rgba(255, 255, 255, 0.04)',
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
                      background: 'rgba(255, 255, 255, 0.04)',
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
                      background: 'rgba(255, 255, 255, 0.04)',
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
                      background: 'rgba(255, 255, 255, 0.04)',
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
          background: 'rgba(0,0,0,0.75)',
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
                    background: 'rgba(255, 255, 255, 0.04)',
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
                      background: 'rgba(255, 255, 255, 0.04)',
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
                      background: 'rgba(255, 255, 255, 0.04)',
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
                    background: 'rgba(255, 255, 255, 0.04)',
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
          background: 'rgba(0,0,0,0.75)',
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
                        background: 'rgba(255, 255, 255, 0.04)',
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
                        background: 'rgba(255, 255, 255, 0.04)',
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
                      background: 'rgba(255, 255, 255, 0.04)',
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
        @media (max-width: 768px) {
          .account-grid-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </SiteLayout>
  );
};

AccountPage.requireAuth = true;

export default AccountPage;
