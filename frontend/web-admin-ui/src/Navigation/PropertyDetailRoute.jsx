import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DormProfileSettings from '../components/Pages/Landlord/DormProfileSettings.jsx';
import { useSidebar } from '../contexts/SidebarContext';

export default function PropertyDetailRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setIsSidebarOpen, open } = useSidebar();

  const handleBack = async () => {
    // reopen sidebar then navigate back to the property summary
    try {
      await open();
    } catch (e) {
      // ignore
    }
    setIsSidebarOpen(true);
    navigate(`/properties/${id}`);
  };

  return (
    <DormProfileSettings propertyId={id} onBack={handleBack} onDeleteRequested={() => {}} />
  );
}
