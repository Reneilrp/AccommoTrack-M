import React from 'react';
import ChatList from '../../components/Shared/Messaging/ChatList';
import ChatArea from '../../components/Shared/Messaging/ChatArea';
import { useMessaging } from '../../components/Shared/Messaging/useMessaging';

export default function Messages({ user, accessRole = 'landlord' }) {
  const messaging = useMessaging(user, accessRole);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 h-full overflow-hidden">
          <ChatList {...messaging} />
        </div>

        {/* Chat Area Main Content */}
        <ChatArea {...messaging} />
      </div>
    </div>
  );
}
