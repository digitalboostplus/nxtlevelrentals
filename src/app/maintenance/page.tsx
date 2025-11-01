'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome,
  faTools,
  faCamera,
  faPaperPlane,
  faCheckCircle,
  faClock,
  faUserTie,
  faWrench,
  faExclamationTriangle,
  faComments,
  faArrowLeft,
  faImage,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

type RequestStatus = 'received' | 'assigned' | 'in_progress' | 'completed';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  images: string[];
  assignedTo?: string;
  estimatedCompletion?: Date;
  messages?: { sender: string; message: string; timestamp: Date }[];
}

export default function MaintenancePage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as const,
    images: [] as File[]
  });
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  // Mock data - replace with actual API calls
  const [requests, setRequests] = useState<MaintenanceRequest[]>([
    {
      id: '1',
      title: 'Leaking Kitchen Faucet',
      description: 'The kitchen faucet has been dripping constantly for the past two days.',
      category: 'Plumbing',
      priority: 'medium',
      status: 'in_progress',
      createdAt: new Date('2025-10-28'),
      updatedAt: new Date('2025-10-29'),
      images: [],
      assignedTo: 'Mike\'s Plumbing Services',
      estimatedCompletion: new Date('2025-11-03'),
      messages: [
        { sender: 'System', message: 'Request received and assigned to Mike\'s Plumbing Services', timestamp: new Date('2025-10-28') },
        { sender: 'Mike\'s Plumbing', message: 'We\'ll be there on Nov 3rd between 10am-2pm', timestamp: new Date('2025-10-29') }
      ]
    },
    {
      id: '2',
      title: 'Air Conditioning Not Working',
      description: 'The AC unit is not cooling properly. It\'s running but only blowing warm air.',
      category: 'HVAC',
      priority: 'high',
      status: 'assigned',
      createdAt: new Date('2025-10-30'),
      updatedAt: new Date('2025-10-30'),
      images: [],
      assignedTo: 'CoolAir HVAC',
      messages: [
        { sender: 'System', message: 'Request assigned to CoolAir HVAC', timestamp: new Date('2025-10-30') }
      ]
    },
    {
      id: '3',
      title: 'Smoke Detector Chirping',
      description: 'Bedroom smoke detector is chirping. Might need battery replacement.',
      category: 'General Maintenance',
      priority: 'low',
      status: 'completed',
      createdAt: new Date('2025-10-20'),
      updatedAt: new Date('2025-10-22'),
      images: [],
      assignedTo: 'Property Maintenance Team',
      messages: [
        { sender: 'System', message: 'Completed by Property Maintenance Team', timestamp: new Date('2025-10-22') }
      ]
    }
  ]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({ ...prev, images: [...prev.images, ...files] }));
    
    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Here you would upload images to Firebase Storage and save the request to Firestore
    const newRequest: MaintenanceRequest = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      status: 'received',
      createdAt: new Date(),
      updatedAt: new Date(),
      images: [], // Would contain uploaded image URLs
      messages: [
        { sender: 'System', message: 'Request received and under review', timestamp: new Date() }
      ]
    };

    setRequests(prev => [newRequest, ...prev]);
    setFormData({
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      images: []
    });
    setPreviewUrls([]);
    setShowForm(false);
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'received': return faClock;
      case 'assigned': return faUserTie;
      case 'in_progress': return faWrench;
      case 'completed': return faCheckCircle;
    }
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case 'received': return '#64748b';
      case 'assigned': return '#A4C639';
      case 'in_progress': return '#2563eb';
      case 'completed': return '#10b981';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'emergency': return '#dc2626';
      default: return '#64748b';
    }
  };

  if (selectedRequest) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e8f2f6 100%)' }}>
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1E4E6B' }}>
                  <FontAwesomeIcon icon={faHome} className="text-white text-xl" />
                </div>
                <span className="text-2xl font-bold" style={{ color: '#1E4E6B' }}>NxtLevel</span>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: '#1E4E6B' }}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Back to Requests</span>
              </button>
            </div>
          </nav>
        </header>

        {/* Request Detail */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ color: '#1E4E6B' }}>
                  {selectedRequest.title}
                </h1>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ 
                    backgroundColor: `${getPriorityColor(selectedRequest.priority)}20`,
                    color: getPriorityColor(selectedRequest.priority)
                  }}>
                    {selectedRequest.priority.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ 
                    backgroundColor: '#f0f4f8',
                    color: '#1E4E6B'
                  }}>
                    {selectedRequest.category}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ 
                backgroundColor: `${getStatusColor(selectedRequest.status)}20`
              }}>
                <FontAwesomeIcon icon={getStatusIcon(selectedRequest.status)} style={{ 
                  color: getStatusColor(selectedRequest.status) 
                }} />
                <span className="font-medium capitalize" style={{ 
                  color: getStatusColor(selectedRequest.status) 
                }}>
                  {selectedRequest.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#2d3748' }}>Description</h3>
              <p style={{ color: '#64748b' }}>{selectedRequest.description}</p>
            </div>

            {selectedRequest.assignedTo && (
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#f0f4f8' }}>
                <div className="flex items-center gap-2 mb-1">
                  <FontAwesomeIcon icon={faUserTie} style={{ color: '#1E4E6B' }} />
                  <span className="font-semibold" style={{ color: '#2d3748' }}>Assigned To</span>
                </div>
                <p style={{ color: '#64748b' }}>{selectedRequest.assignedTo}</p>
                {selectedRequest.estimatedCompletion && (
                  <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                    Estimated completion: {selectedRequest.estimatedCompletion.toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {selectedRequest.messages && selectedRequest.messages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#2d3748' }}>
                  <FontAwesomeIcon icon={faComments} style={{ color: '#1E4E6B' }} />
                  Communication History
                </h3>
                <div className="space-y-3">
                  {selectedRequest.messages.map((msg, idx) => (
                    <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: '#f0f4f8' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm" style={{ color: '#1E4E6B' }}>
                          {msg.sender}
                        </span>
                        <span className="text-xs" style={{ color: '#64748b' }}>
                          {msg.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: '#2d3748' }}>{msg.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm" style={{ color: '#64748b' }}>
              <span>Created: {selectedRequest.createdAt.toLocaleDateString()}</span>
              <span>Last updated: {selectedRequest.updatedAt.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e8f2f6 100%)' }}>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1E4E6B' }}>
                <FontAwesomeIcon icon={faHome} className="text-white text-xl" />
              </div>
              <span className="text-2xl font-bold" style={{ color: '#1E4E6B' }}>NxtLevel</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <a href="/" className="text-[#64748b] hover:text-[#1E4E6B] transition-colors font-medium">
                Dashboard
              </a>
              <button className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: '#1E4E6B' }}>
                John Doe
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#1E4E6B' }}>
                Maintenance Requests
              </h1>
              <p className="text-lg" style={{ color: '#64748b' }}>
                Submit and track your property maintenance requests
              </p>
            </div>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity shadow-lg"
              style={{ backgroundColor: '#A4C639' }}
            >
              <FontAwesomeIcon icon={showForm ? faTimes : faTools} />
              {showForm ? 'Cancel' : 'New Request'}
            </button>
          </div>
        </div>

        {/* New Request Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#1E4E6B' }}>
              Submit New Maintenance Request
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#2d3748' }}>
                    Request Title *
                  </label>
                  <input 
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#A4C639] transition-colors"
                    placeholder="e.g., Leaking Faucet"
                    style={{ color: '#2d3748' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#2d3748' }}>
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#A4C639] transition-colors"
                    style={{ color: '#2d3748' }}
                  >
                    <option value="">Select a category</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Appliances">Appliances</option>
                    <option value="General Maintenance">General Maintenance</option>
                    <option value="Pest Control">Pest Control</option>
                    <option value="Locks & Keys">Locks & Keys</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#2d3748' }}>
                  Priority Level *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['low', 'medium', 'high', 'emergency'] as const).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority }))}
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${
                        formData.priority === priority ? 'ring-2 ring-offset-2' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `${getPriorityColor(priority)}20`,
                        color: getPriorityColor(priority),
                        ringColor: formData.priority === priority ? getPriorityColor(priority) : undefined
                      }}
                    >
                      {priority === 'emergency' && <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />}
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#2d3748' }}>
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#A4C639] transition-colors resize-none"
                  placeholder="Please provide detailed information about the issue..."
                  style={{ color: '#2d3748' }}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#2d3748' }}>
                  <FontAwesomeIcon icon={faCamera} className="mr-2" />
                  Upload Photos (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#A4C639] transition-colors cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <FontAwesomeIcon icon={faImage} className="text-4xl mb-3" style={{ color: '#64748b' }} />
                    <p className="font-medium mb-1" style={{ color: '#2d3748' }}>
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm" style={{ color: '#64748b' }}>
                      PNG, JPG, HEIC up to 10MB each
                    </p>
                  </label>
                </div>
                
                {previewUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={url} 
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity shadow-lg"
                  style={{ backgroundColor: '#A4C639' }}
                >
                  <FontAwesomeIcon icon={faPaperPlane} />
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ title: '', description: '', category: '', priority: 'medium', images: [] });
                    previewUrls.forEach(url => URL.revokeObjectURL(url));
                    setPreviewUrls([]);
                  }}
                  className="px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors border-2"
                  style={{ borderColor: '#1E4E6B', color: '#1E4E6B' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Status Legend */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#2d3748' }}>Request Status Guide</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { status: 'received' as const, label: 'Received', desc: 'Under review' },
              { status: 'assigned' as const, label: 'Assigned', desc: 'Contractor assigned' },
              { status: 'in_progress' as const, label: 'In Progress', desc: 'Work underway' },
              { status: 'completed' as const, label: 'Completed', desc: 'Work finished' }
            ].map((item) => (
              <div key={item.status} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#f0f4f8' }}>
                <FontAwesomeIcon 
                  icon={getStatusIcon(item.status)} 
                  className="text-xl"
                  style={{ color: getStatusColor(item.status) }} 
                />
                <div>
                  <div className="font-semibold text-sm" style={{ color: '#2d3748' }}>{item.label}</div>
                  <div className="text-xs" style={{ color: '#64748b' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Requests List */}
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#1E4E6B' }}>
            Your Requests
          </h2>
          
          {requests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FontAwesomeIcon icon={faTools} className="text-6xl mb-4" style={{ color: '#64748b' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#2d3748' }}>
                No maintenance requests yet
              </h3>
              <p style={{ color: '#64748b' }}>
                Click "New Request" to submit your first maintenance request
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {requests.map((request) => (
                <div 
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2" style={{ color: '#1E4E6B' }}>
                        {request.title}
                      </h3>
                      <p className="mb-3 line-clamp-2" style={{ color: '#64748b' }}>
                        {request.description}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ 
                          backgroundColor: `${getPriorityColor(request.priority)}20`,
                          color: getPriorityColor(request.priority)
                        }}>
                          {request.priority.toUpperCase()}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ 
                          backgroundColor: '#f0f4f8',
                          color: '#1E4E6B'
                        }}>
                          {request.category}
                        </span>
                        {request.assignedTo && (
                          <span className="text-xs flex items-center gap-1" style={{ color: '#64748b' }}>
                            <FontAwesomeIcon icon={faUserTie} />
                            {request.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap" style={{ 
                        backgroundColor: `${getStatusColor(request.status)}20`
                      }}>
                        <FontAwesomeIcon icon={getStatusIcon(request.status)} style={{ 
                          color: getStatusColor(request.status) 
                        }} />
                        <span className="font-medium capitalize text-sm" style={{ 
                          color: getStatusColor(request.status) 
                        }}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-center mt-2" style={{ color: '#64748b' }}>
                        {request.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

