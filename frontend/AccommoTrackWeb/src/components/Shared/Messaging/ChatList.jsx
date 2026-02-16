import React from 'react';
import { Search, Filter, MessageCircle, X, ChevronDown, AlertTriangle } from 'lucide-react';
import { SkeletonConversation } from '../Skeleton';

const ChatList = ({
  conversations,
  selectedChat,
  setSelectedChat,
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  filterProperty,
  setFilterProperty,
  propertyOptions,
  loading,
  caretakerMessagingRestricted,
  getInitials,
  formatTime
}) => {
  
  const activeFiltersCount = filterProperty ? 1 : 0;

  const clearFilters = () => {
    setFilterProperty('');
  };

  // Use the search and filter logic directly on the passed conversations
  const filteredConversations = (conversations || []).filter((conv) => {
    const name = `${conv.other_user?.first_name} ${conv.other_user?.last_name}`.toLowerCase();
    const matchesSearch = name.includes((searchQuery || '').toLowerCase());
    const matchesProperty = !filterProperty || conv.property?.id === parseInt(filterProperty);
    return matchesSearch && matchesProperty;
  });

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {/* Search and Filter Row */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 border rounded-lg transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-green-50 border-green-500 text-green-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400'
            }`}
          >
            <Filter className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Filters</span>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Property</label>
              <div className="relative">
                <select
                  value={filterProperty}
                  onChange={(e) => setFilterProperty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white dark:bg-gray-700 text-sm dark:text-white"
                >
                  <option value="">All Properties</option>
                  {propertyOptions.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.title || prop.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {caretakerMessagingRestricted && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <p>Read-only access.</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(6)].map((_, i) => (
              <SkeletonConversation key={i} />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No conversations yet</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedChat(conv)}
              className={`w-full p-4 flex items-start gap-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                selectedChat?.id === conv.id ? 'bg-green-50 dark:bg-green-900/30' : ''
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    {getInitials(conv.other_user)}
                  </span>
                </div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="truncate">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {conv.other_user?.first_name} {conv.other_user?.last_name}
                    </p>
                    {conv.property && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.property.title}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {conv.last_message?.message || 'No messages yet'}
                </p>
              </div>
              {conv.unread_count > 0 && (
                <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 ml-1">
                  <span className="text-[10px] text-white font-bold">{conv.unread_count}</span>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;
