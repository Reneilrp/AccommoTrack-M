import React, { useState, useEffect } from 'react';
import { propertyService } from '../../../services/propertyServices';
import PropertyMap from '../../../components/Shared/PropertyMap';
import { getImageUrl } from '../../../utils/api';
import { useNavigate } from 'react-router-dom';

const TenantDashboard = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [filters, setFilters] = useState({
    search: '',
    type: 'All',
    minPrice: '',
    maxPrice: ''
  });

  const [error, setError] = useState(null);

  const propertyTypes = ['All', 'Dormitory', 'Apartment', 'Boarding House', 'Bed Spacer'];

  // Debounce search and filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProperties();
    }, 500);

    return () => clearTimeout(timer);
  }, [filters]);

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass filters to service
      const data = await propertyService.getAllProperties({
        ...filters,
        type: filters.type === 'All' ? '' : filters.type
      });
      // Ensure data is an array (handle API response structure)
      const propertyList = Array.isArray(data) ? data : (data.data || []);
      setProperties(propertyList);
    } catch (error) {
      console.error('Failed to fetch properties', error);
      setError('Failed to load properties. Please try again.');
      // Fallback to empty list if API fails
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header / Search Section */}
      <div className="bg-white p-4 shadow-sm mb-4 rounded-lg">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 w-full relative group">
            <input
              type="text"
              placeholder="Search properties, locations..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all shadow-sm group-hover:border-green-300"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Map
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center">
          {propertyTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilters({...filters, type})}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                filters.type === type
                  ? 'bg-green-600 text-white border-green-600 shadow-md ring-2 ring-green-100'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 text-center text-sm font-medium border-b border-red-100">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto h-full pb-20 pr-2">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} onClick={() => navigate(`/property/${property.id}`)} />
                ))}
                {properties.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    No properties found matching your criteria.
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full w-full rounded-lg overflow-hidden shadow-inner border border-gray-200">
                <PropertyMap 
                  properties={properties} 
                  onMarkerClick={(p) => navigate(`/property/${p.id}`)} 
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Helper Component for Property Card
const PropertyCard = ({ property, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden border border-gray-100 group flex flex-col h-full"
  >
    <div className="relative h-48 bg-gray-200 shrink-0">
      <img 
        src={getImageUrl(property.image || property.images?.[0]?.image_path) || 'https://via.placeholder.com/400x300?text=No+Image'} 
        alt={property.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-gray-700 shadow-sm">
        {property.type}
      </div>
    </div>
    <div className="p-4 flex flex-col flex-1">
      <h3 className="font-bold text-lg text-gray-900 line-clamp-1 mb-1" title={property.name}>{property.name}</h3>
      <p className="text-gray-500 text-sm flex items-center">
        <svg className="w-4 h-4 mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="truncate">{property.address}</span>
      </p>
    </div>
  </div>
);

export default TenantDashboard;
