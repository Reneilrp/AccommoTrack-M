import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Loader2, Building2 } from 'lucide-react';
import { showError } from '../../utils/toast';
import propertyService from '../../services/propertyService';
import { useUIState } from '../../contexts/UIStateContext';
import PropertyStats from './components/MyProperties/PropertyStats';
import PropertyFilters from './components/MyProperties/PropertyFilters';
import PropertyCard from './components/MyProperties/PropertyCard';
import AddProperty from './AddProperty';
import DormProfileSettings from './DormProfileSettings';

export default function MyProperties() {
  const navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_properties;

  const [properties, setProperties] = useState(cachedData?.properties || []);
  const [stats, setStats] = useState(cachedData?.stats || null);
  const [loading, setLoading] = useState(!cachedData);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [view, setView] = useState('list'); // list, add, settings
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await propertyService.getProperties();
      if (res.success) {
        setProperties(res.data);
        // Calculate basic stats locally if no endpoint exists
        const total = res.data.length;
        const rooms = res.data.reduce((sum, p) => sum + (p.total_rooms || 0), 0);
        const occupancy = res.data.reduce((sum, p) => sum + (p.occupancy_rate || 0), 0) / (total || 1);
        const newStats = { total, rooms, tenants: 0, occupancy: Math.round(occupancy) };
        setStats(newStats);
        updateData('landlord_properties', { properties: res.data, stats: newStats });
      }
    } catch (_err) {
      showError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [updateData]);

  useEffect(() => { if (view === 'list') fetchProperties(); }, [view, fetchProperties]);

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.current_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (view === 'add') {
    return <AddProperty onBack={() => setView('list')} onSave={() => setView('list')} />;
  }

  if (view === 'settings') {
    return <DormProfileSettings propertyId={selectedPropertyId} onBack={() => setView('list')} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Properties</h1>
          <p className="text-sm text-gray-500">Overview and management of your real estate portfolio.</p>
        </div>
        <button onClick={fetchProperties} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <PropertyStats stats={stats} />
      
      <PropertyFilters 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        onAddClick={() => setView('add')}
      />

      {loading && properties.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[...Array(6)].map((_, i) => <div key={i} className="h-80 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center border border-gray-100 dark:border-gray-700">
           <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-10 h-10 text-gray-300" />
           </div>
           <h3 className="text-lg font-bold text-gray-900 dark:text-white">No properties found</h3>
           <p className="text-sm text-gray-500 mt-1">Start by adding your first property listing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map(p => (
            <PropertyCard 
              key={p.id} 
              property={p} 
              onManage={() => navigate(`/properties/${p.id}`)}
              onEdit={() => { setSelectedPropertyId(p.id); setView('settings'); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}