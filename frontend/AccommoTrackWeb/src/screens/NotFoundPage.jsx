import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage({ 
  title = "Page Not Found", 
  message = "Sorry, we couldn't find the page you're looking for.",
  showHomeButton = true 
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Illustration or Icon */}
        <div className="relative mx-auto w-48 h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full mb-8">
          <Search className="w-24 h-24 text-gray-300 dark:text-gray-600" />
          <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-700 p-3 rounded-full shadow-lg border border-gray-100 dark:border-gray-600">
            <span className="text-4xl">🤔</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {title === "Page Not Found" ? "404" : "Oops!"}
          </h1>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {title === "Page Not Found" ? "Page Not Found" : title}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {message}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          {showHomeButton && (
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors shadow-md shadow-green-600/20"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
