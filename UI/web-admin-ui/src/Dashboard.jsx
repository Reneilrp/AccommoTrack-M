import { useState } from 'react';

function Dashboard({ user, onLogout }) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await onLogout();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Welcome!</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Name:</span> {user.name}
          </p>
          <p className="text-gray-700">
            <span className="font-semibold">Email:</span> {user.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition duration-300 disabled:bg-red-300"
        >
          {loading ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </div>
  );
}

export default Dashboard;