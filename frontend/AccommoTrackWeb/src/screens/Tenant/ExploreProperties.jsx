import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { showError } from "../../utils/toast";
import { propertyService } from "../../services/propertyService";
import { useUIState } from "../../contexts/UIStateContext";
import ExploreHeader from "./components/Explore/ExploreHeader";
import ExploreFilters from "./components/Explore/ExploreFilters";
import ExplorePropertyCard from "./components/Explore/ExplorePropertyCard";
import ExploreMap from "./components/Explore/ExploreMap";
import { Skeleton } from "../../components/Shared/Skeleton";
import Footer from "../../components/Shared/Footer";

export default function ExploreProperties() {
  const navigate = useNavigate();
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.explore_properties;

  const [properties, setProperties] = useState(cachedData?.properties || []);
  const [loading, setLoading] = useState(!cachedData);
  const [viewMode, setViewMode] = useState('list'); // list or map
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [priceRange, setPriceRange] = useState(10000);
  const [types] = useState([{ value: 'All', label: 'All', count: null }]);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await propertyService.getExploreProperties({
        search: searchQuery,
        type: selectedType !== 'All' ? selectedType : undefined,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
        max_price: priceRange
      });
      if (res.success) {
        setProperties(res.data);
        updateData('explore_properties', { properties: res.data });
      }
    } catch (_err) {
      showError('Failed to load accommodations');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedType, selectedAmenities, priceRange, updateData]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handlePropertyClick = (id) => navigate(`/properties/${id}`);

  const handleToggleAmenity = useCallback((amenity) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <ExploreHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onToggleFilters={() => setShowFilters(true)}
      />

      <ExploreFilters 
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        types={types}
        selectedAmenities={selectedAmenities}
        onToggleAmenity={handleToggleAmenity}
        priceRange={priceRange}
        onPriceChange={setPriceRange}
      />

      <main className="flex-1 flex flex-col">
        {viewMode === 'map' ? (
          <ExploreMap 
            properties={properties} 
            onPropertyClick={handlePropertyClick} 
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-8 w-full">
            {loading && properties.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[400px] rounded-3xl" />)}
              </div>
            ) : properties.length === 0 ? (
              <div className="py-20 text-center">
                 <p className="text-gray-500">No properties found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                {properties.map(p => (
                  <ExplorePropertyCard 
                    key={p.id} 
                    property={p} 
                    onClick={handlePropertyClick} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}