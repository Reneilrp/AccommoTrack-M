import React, { createContext, useContext, useEffect, useRef } from 'react';
import { getEcho, disconnectEcho } from '../utils/echo';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ user, children }) => {
  const echoRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      echoRef.current = getEcho();
    } else {
      disconnectEcho();
      echoRef.current = null;
    }

    return () => {
      // We don't disconnect on every re-render, only when the provider unmounts (app close/logout)
    };
  }, [user?.id]);

  return (
    <WebSocketContext.Provider value={echoRef.current}>
      {children}
    </WebSocketContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWebSocket = () => {
  return useContext(WebSocketContext);
};
