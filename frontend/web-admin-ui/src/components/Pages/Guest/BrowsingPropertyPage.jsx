import React, { useEffect, useState } from "react";

// Mock data for demonstration
const mockProperties = [
  {
    id: 1,
    name: "Sunrise Residences",
    rooms: [
      { id: 101, name: "Deluxe Room", price: 4700, status: "Occupied", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb" },
      { id: 102, name: "Suite Room", price: 5935, status: "Available", image: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd" },
      { id: 103, name: "Standard Room", price: 3789, status: "Occupied", image: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca" },
    ],
  },
  {
    id: 2,
    name: "Greenfield Towers",
    rooms: [
      { id: 201, name: "Studio", price: 3652, status: "Available", image: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae" },
      { id: 202, name: "Family Suite", price: 5022, status: "Occupied", image: "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99" },
      { id: 203, name: "Single Room", price: 5204, status: "Available", image: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308" },
    ],
  },
];

const BrowsingPropertyPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 2; // Number of properties per page

  useEffect(() => {
    // Simulate API call delay
    setTimeout(() => {
      setProperties(mockProperties);
      setLoading(false);
    }, 600);
  }, []);

  // Filtered properties
  const filtered = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.rooms.some((room) => room.name.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Handlers
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };
  // Removed city filter handler
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div
      style={{
        fontFamily: 'Segoe UI, Arial, sans-serif',
        background: '#f9fafb',
        minHeight: '100vh',
        padding: 0,
        margin: 0,
      }}
    >
      <header
        style={{
          background: '#fff',
          padding: '24px 0 12px 0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontWeight: 700, fontSize: 32, color: '#2d2d2d', margin: 0 }}>
          Browse Properties
        </h1>
      </header>
      <section style={{ maxWidth: 1200, margin: '40px auto', padding: '0 16px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>
          Property Listings
        </h2>
        {/* Search and Filter Controls */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by property or room name..."
            value={search}
            onChange={handleSearchChange}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 16,
              flex: 1,
              minWidth: 0,
            }}
          />
        </div>
        {loading ? (
          <div style={{ color: '#888', fontSize: 18, textAlign: 'center', marginTop: 60 }}>
            Loading properties...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#888', fontSize: 18, textAlign: 'center', marginTop: 60 }}>
            No properties found.
          </div>
        ) : (
          paginated.map((property) => (
            <div key={property.id} style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>
                  {property.name}
                </h3>
              </div>
              {/* Room Carousel */}
              <div
                style={{
                  display: 'flex',
                  overflowX: 'auto',
                  gap: 20,
                  paddingBottom: 8,
                }}
              >
                {property.rooms.map((room) => (
                  <div
                    key={room.id}
                    style={{
                      minWidth: 240,
                      background: '#fff',
                      borderRadius: 16,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                      marginBottom: 4,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: 150, overflow: 'hidden' }}>
                      <img
                        src={room.image}
                        alt={room.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          background: room.status === 'Occupied' ? '#f87171' : '#34d399',
                          color: '#fff',
                          borderRadius: 6,
                          padding: '2px 10px',
                          fontSize: 13,
                          fontWeight: 500,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        }}
                      >
                        {room.status}
                      </span>
                    </div>
                    <div style={{ padding: '14px 16px 12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{room.name}</div>
                      <div style={{ color: '#6366f1', fontWeight: 500, fontSize: 15 }}>
                        ₱{room.price.toLocaleString()} / 2 nights
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        {/* Pagination Controls */}
        {filtered.length > pageSize && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                background: currentPage === 1 ? '#e5e7eb' : '#fff',
                color: '#333',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  background: currentPage === page ? '#6366f1' : '#fff',
                  color: currentPage === page ? '#fff' : '#333',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                background: currentPage === totalPages ? '#e5e7eb' : '#fff',
                color: '#333',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default BrowsingPropertyPage;
