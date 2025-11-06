import React, { useState } from 'react';

export default function TenantManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [tenants, setTenants] = useState([
    {
      id: 1,
      name: 'Pheinz Magnun',
      email: 'pheinz.magnun@gmail.com',
      phone: '+63 993 692 9775',
      roomNumber: '101',
      roomType: 'Single Room',
      checkInDate: '2025-02-15',
      monthlyRent: 5000,
      status: 'active',
      paymentStatus: 'paid',
      lastPayment: '2025-03-13',
      emergencyContact: {
        name: 'Pheinz Sister',
        relationship: 'Sister',
        phone: '+63 912 345 6780'
      },
      documents: ['Valid ID', 'Contract Signed']
    },
    {
      id: 2,
      name: 'Jean Claro',
      email: 'JinBilog@gmail.com',
      phone: '+63 976 434 1384',
      roomNumber: '102',
      roomType: 'Double Room',
      checkInDate: '2025-02-10',
      monthlyRent: 4500,
      status: 'active',
      paymentStatus: 'pending',
      lastPayment: '2025-02-25',
      emergencyContact: {
        name: 'Jean Father',
        relationship: 'Father',
        phone: '+63 923 456 7891'
      },
      documents: ['Valid ID', 'Contract Signed', 'Barangay Clearance']
    },
    {
      id: 3,
      name: 'JP Enriquez',
      email: 'JPEnriquez@gmail.com',
      phone: '+63 934 567 8901',
      roomNumber: '102',
      roomType: 'Double Room',
      checkInDate: '2025-04-20',
      monthlyRent: 4500,
      status: 'active',
      paymentStatus: 'paid',
      lastPayment: '2025-05-15',
      emergencyContact: {
        name: 'JP Mom',
        relationship: 'Mother',
        phone: '+63 934 567 8902'
      },
      documents: ['Valid ID', 'Contract Signed']
    },
    {
      id: 4,
      name: 'Ar-rauf Imar',
      email: 'ArRaufImar@gmail.com',
      phone: '+63 945 678 9012',
      roomNumber: '201',
      roomType: 'Quad Room',
      checkInDate: '2025-04-05',
      monthlyRent: 3500,
      status: 'active',
      paymentStatus: 'overdue',
      lastPayment: '2025-03-03',
      emergencyContact: {
        name: 'Rauf Father',
        relationship: 'Father',
        phone: '+63 945 678 9013'
      },
      documents: ['Valid ID']
    },
    {
      id: 5,
      name: 'Rhadzmiel Sali',
      email: 'RhadzmielSali@gmail.com',
      phone: '+63 956 789 0123',
      roomNumber: '201',
      roomType: 'Quad Room',
      checkInDate: '2024-05-12',
      monthlyRent: 3500,
      status: 'inactive',
      paymentStatus: 'paid',
      lastPayment: '2025-05-01',
      emergencyContact: {
        name: 'Lisa Brown',
        relationship: 'Sister',
        phone: '+63 956 789 0124'
      },
      documents: ['Valid ID', 'Contract Signed']
    }
  ]);

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.roomNumber.includes(searchTerm) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    paid: tenants.filter(t => t.paymentStatus === 'paid').length,
    pending: tenants.filter(t => t.paymentStatus === 'pending').length,
    overdue: tenants.filter(t => t.paymentStatus === 'overdue').length
  };

  const handleViewDetails = (tenant) => {
    setSelectedTenant(tenant);
    setShowDetailsModal(true);
  };

  const getPaymentStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage all tenants and their room assignments</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Tenants</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Paid</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.paid}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Overdue</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdue}</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, room number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-green-600 font-semibold">
                            {tenant.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                          <div className="text-xs text-gray-500">{tenant.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Room {tenant.roomNumber}</div>
                      <div className="text-xs text-gray-500">{tenant.roomType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tenant.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ₱{tenant.monthlyRent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(tenant.paymentStatus)}`}>
                        {tenant.paymentStatus.charAt(0).toUpperCase() + tenant.paymentStatus.slice(1)}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Last: {tenant.lastPayment}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(tenant.status)}`}>
                        {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewDetails(tenant)}
                        className="text-green-600 hover:text-green-800 font-medium mr-3"
                      >
                        View
                      </button>
                      <button className="text-blue-600 hover:text-blue-800 font-medium">
                        Message
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tenant Details Modal */}
      {showDetailsModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Tenant Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Full Name:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedTenant.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedTenant.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedTenant.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Check-in Date:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedTenant.checkInDate}</span>
                  </div>
                </div>
              </div>

              {/* Room Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Room Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Room Number:</span>
                    <span className="text-sm font-medium text-gray-900">Room {selectedTenant.roomNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Room Type:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedTenant.roomType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Monthly Rent:</span>
                    <span className="text-sm font-semibold text-green-600">₱{selectedTenant.monthlyRent.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Payment Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Payment Status:</span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(selectedTenant.paymentStatus)}`}>
                      {selectedTenant.paymentStatus.charAt(0).toUpperCase() + selectedTenant.paymentStatus.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Payment:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedTenant.lastPayment}</span>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Emergency Contact
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedTenant.emergencyContact.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Relationship:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedTenant.emergencyContact.relationship}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedTenant.emergencyContact.phone}</span>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Documents
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTenant.documents.map((doc, index) => (
                    <span key={index} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-lg">
                      ✓ {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Send Message
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Edit Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}