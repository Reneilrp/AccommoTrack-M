import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { SkeletonTableRow } from '../../components/Shared/Skeleton';
import { showSuccess, showError } from '../../utils/toast';
import landlordService from '../../services/landlordService';
import propertyService from '../../services/propertyService';
import PropertySelector from './components/Tenants/PropertySelector';
import TenantFilters from './components/Tenants/TenantFilters';
import TenantCard from './TenantCard';
import AssignRoomModal from './components/Tenants/AssignRoomModal';
import TransferRoomModal from './components/Tenants/TransferRoomModal';
import CreateTenantModal from './components/Tenants/CreateTenantModal';

export default function TenantManagement() {

  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchProperties = useCallback(async () => {
    const res = await propertyService.getProperties();
    if (res.success) {
      setProperties(res.data);
      if (res.data.length > 0) {
        setSelectedPropertyId(prev => prev || res.data[0].id);
      }
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    if (!selectedPropertyId) return;
    setLoading(true);
    const res = await landlordService.getTenants({ property_id: selectedPropertyId, search: searchQuery });
    if (res.success) {
      setTenants(res.data.items);
    }
    setLoading(false);
  }, [selectedPropertyId, searchQuery]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);
  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const loadRooms = async () => {
    setLoadingRooms(true);
    const res = await propertyService.getRooms(selectedPropertyId, { status: 'available' });
    if (res.success) setAvailableRooms(res.data);
    setLoadingRooms(false);
  };

  const handleDataChange = (setter) => (field, value) => {
    setter(prev => ({ ...prev, [field]: value }));
  };

  const handleAssign = async () => {
    setProcessing(true);
    const res = await landlordService.assignRoom(selectedTenant.id, assignData);
    if (res.success) {
      showSuccess('Room assigned successfully');
      fetchTenants();
      setShowAssignModal(false);
      setAssignData({ room_id: '', move_in_date: '', end_date: '', notes: '' });
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const handleTransfer = async () => {
    setProcessing(true);
    const res = await landlordService.transferRoom(selectedTenant.id, transferData);
    if (res.success) {
      showSuccess('Room transfer completed');
      fetchTenants();
      setShowTransferModal(false);
      setTransferData({ new_room_id: '', reason: '' });
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const handleCreateTenant = async () => {
    setProcessing(true);
    const res = await landlordService.createTenant(createData);
    if (res.success) {
      showSuccess('Tenant created successfully');
      fetchTenants();
      setShowCreateModal(false);
      setCreateData({ first_name: '', last_name: '', email: '', phone: '', room_id: '', move_in_date: '', end_date: '' });
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const [assignData, setAssignData] = useState({ room_id: '', move_in_date: '', end_date: '', notes: '' });
  const [transferData, setTransferData] = useState({ new_room_id: '', reason: '' });
  const [createData, setCreateData] = useState({ first_name: '', last_name: '', email: '', phone: '', room_id: '', move_in_date: '', end_date: '' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PropertySelector 
        properties={properties} 
        selectedId={selectedPropertyId} 
        onChange={setSelectedPropertyId} 
      />

      <TenantFilters 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateClick={() => setShowCreateModal(true)}
      />

      {loading && tenants.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center border border-gray-100 dark:border-gray-700">
           <p className="text-gray-500">No tenants found for this property.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
           {tenants.map(tenant => (
             <TenantCard 
               key={tenant.id} 
               tenant={tenant}
               onAssign={() => { setSelectedTenant(tenant); loadRooms(); setShowAssignModal(true); }}
               onTransfer={() => { setSelectedTenant(tenant); loadRooms(); setShowTransferModal(true); }}
             />
           ))}
        </div>
      )}

      <AssignRoomModal 
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        tenant={selectedTenant}
        rooms={availableRooms}
        loadingRooms={loadingRooms}
        data={assignData}
        onDataChange={handleDataChange(setAssignData)}
        onSubmit={handleAssign}
        submitting={processing}
      />

      <TransferRoomModal 
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        tenant={selectedTenant}
        rooms={availableRooms}
        loadingRooms={loadingRooms}
        data={transferData}
        onDataChange={handleDataChange(setTransferData)}
        onSubmit={handleTransfer}
        submitting={processing}
      />

      <CreateTenantModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        rooms={availableRooms}
        loadingRooms={loadingRooms}
        data={createData}
        onDataChange={handleDataChange(setCreateData)}
        onSubmit={handleCreateTenant}
        submitting={processing}
      />
    </div>
  );
}