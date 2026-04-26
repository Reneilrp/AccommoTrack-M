import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useWebSocket } from '../../contexts/WebSocketContext';

/**
 * Visual indicator for WebSocket (Echo) connection status.
 */
const RealTimeStatus = () => {
  const { connectionStatus, isConnected } = useWebSocket();

  if (isConnected) return null; // Hide if connected

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          text: 'Connecting...',
          className: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
        };
      case 'unavailable':
      case 'failed':
      case 'disconnected':
        return {
          icon: <WifiOff className="w-3 h-3" />,
          text: 'Real-time Offline',
          className: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
        };
      default:
        return {
          icon: <WifiOff className="w-3 h-3" />,
          text: 'Disconnected',
          className: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div 
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-current transition-all animate-in fade-in duration-300 ${config.className}`}
      title={`Connection Status: ${connectionStatus}`}
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
};

export default RealTimeStatus;
