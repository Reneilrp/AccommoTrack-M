import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getEcho, disconnectEcho } from '../utils/echo';

const WebSocketContext = createContext({
  echo: null,
  isConnected: false,
  connectionStatus: 'disconnected'
});

export const WebSocketProvider = ({ user, children }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const echoRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      const echo = getEcho();
      echoRef.current = echo;

      if (echo && echo.connector && echo.connector.pusher) {
        const pusher = echo.connector.pusher;

        const updateStatus = () => {
          setConnectionStatus(pusher.connection.state);
          console.log(`[Echo] Connection state changed to: ${pusher.connection.state}`);
        };

        pusher.connection.bind('state_change', updateStatus);
        setConnectionStatus(pusher.connection.state);

        return () => {
          pusher.connection.unbind('state_change', updateStatus);
        };
      }
    } else {
      disconnectEcho();
      echoRef.current = null;
      setConnectionStatus('disconnected');
    }
  }, [user?.id]);

  const value = {
    echo: echoRef.current,
    isConnected: connectionStatus === 'connected',
    connectionStatus
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWebSocket = () => {
  return useContext(WebSocketContext);
};

