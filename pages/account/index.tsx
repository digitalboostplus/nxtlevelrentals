import Head from 'next/head';
import { useState } from 'react';
import SiteLayout from '@/components/Layout/SiteLayout';
import { useAuth } from '@/context/AuthContext';
import type { NextPageWithAuth } from '../_app';

const AccountPage: NextPageWithAuth = () => {
    const { user, profile, role } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'payments' | 'notifications'>('profile');

    return (
        <SiteLayout>
            <Head>
                <title>My Account - Next Level Rentals</title>
            </Head>

            <div className="section section--full-height">
                <div className="section__inner">
                    <div className="card__header mb-8">
                        <div>
                            <h1 className="text-3xl font-bold">My Account</h1>
                            <p className="text-gray-500">Manage your profile and preferences</p>
                        </div>
                        <span className="tag tag--info capitalize">{role} Account</span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Sidebar */}
                        <aside className="w-full md:w-64">
                            <nav className="flex flex-col gap-2">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                                        }`}
                                >
                                    Profile Information
                                </button>
                                {role === 'tenant' && (
                                    <button
                                        onClick={() => setActiveTab('payments')}
                                        className={`text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'payments' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                                            }`}
                                    >
                                        Payment Methods
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveTab('notifications')}
                                    className={`text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'notifications' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                                        }`}
                                >
                                    Notifications
                                </button>
                            </nav>
                        </aside>

                        {/* Content */}
                        <main className="flex-1 bg-white rounded-xl shadow-sm border p-6">
                            {activeTab === 'profile' && (
                                <div>
                                    <h2 className="text-xl font-bold mb-6">Profile Details</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                            <div className="p-3 bg-gray-50 rounded border">{profile?.displayName || 'Not set'}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                            <div className="p-3 bg-gray-50 rounded border">{user?.email}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                            <div className="p-3 bg-gray-50 rounded border">{profile?.phoneNumber || 'Not linked'}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                            <div className="p-3 bg-gray-50 rounded border capitalize">{role}</div>
                                        </div>
                                    </div>
                                    <div className="mt-8">
                                        <button className="outline-button">Edit Profile</button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'payments' && (
                                <div>
                                    <h2 className="text-xl font-bold mb-6">Saved Payment Methods</h2>
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6 flex items-start gap-3">
                                        <div className="text-blue-500 mt-0.5">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="16" x2="12" y2="12" />
                                                <line x1="12" y1="8" x2="12.01" y2="8" />
                                            </svg>
                                        </div>
                                        <p className="text-sm text-blue-700">
                                            Manage your bank accounts and credit cards for easy rent payments.
                                        </p>
                                    </div>
                                    <p className="text-gray-500 italic">No payment methods saved yet.</p>
                                    <button className="mt-4 outline-button">Add Payment Method</button>
                                </div>
                            )}

                            {activeTab === 'notifications' && (
                                <div>
                                    <h2 className="text-xl font-bold mb-6">Notification Preferences</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <h3 className="font-medium">Rent Reminders</h3>
                                                <p className="text-sm text-gray-500">Get notified 3 days before rent is due</p>
                                            </div>
                                            <input type="checkbox" defaultChecked className="h-5 w-5 accent-primary" />
                                        </div>
                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <h3 className="font-medium">Maintenance Updates</h3>
                                                <p className="text-sm text-gray-500">Updates on your maintenance requests</p>
                                            </div>
                                            <input type="checkbox" defaultChecked className="h-5 w-5 accent-primary" />
                                        </div>
                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <h3 className="font-medium">Direct Messages</h3>
                                                <p className="text-sm text-gray-500">Chat messages from management</p>
                                            </div>
                                            <input type="checkbox" defaultChecked className="h-5 w-5 accent-primary" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>
        </SiteLayout>
    );
};

AccountPage.requireAuth = true;

export default AccountPage;
