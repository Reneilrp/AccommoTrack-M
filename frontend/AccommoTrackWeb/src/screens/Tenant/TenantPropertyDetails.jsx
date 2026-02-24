import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropertyDetails from './PropertyDetails';
import { useSidebar } from '../../contexts/SidebarContext';

const TenantPropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { collapse } = useSidebar();

  useEffect(() => {
    collapse();
  }, [collapse]);

  return (
    <PropertyDetails 
      propertyId={id} 
      onBack={() => navigate(-1)} 
    />
  );
};

export default TenantPropertyDetails;
