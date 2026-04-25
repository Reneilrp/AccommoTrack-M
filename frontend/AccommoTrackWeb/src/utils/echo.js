import Echo from "laravel-echo";
import Pusher from "pusher-js";
import api, { shouldUseBearerForRequest } from "./api";

window.Pusher = Pusher;

let echoInstance = null;

/**
 * Singleton getter for Echo instance
 */
export const getEcho = () => {
  if (echoInstance) return echoInstance;

  const REVERB_KEY =
    import.meta.env.VITE_REVERB_APP_KEY ||
    import.meta.env.VITE_REVERB_KEY ||
    import.meta.env.REVERB_APP_KEY ||
    import.meta.env.REVERB_KEY;
  const REVERB_HOST =
    import.meta.env.VITE_REVERB_HOST ||
    import.meta.env.VITE_REVERB_WS_HOST ||
    import.meta.env.REVERB_HOST ||
    window.location.hostname;
  const REVERB_PORT =
    import.meta.env.VITE_REVERB_PORT || import.meta.env.REVERB_PORT || 8080;
  const REVERB_SCHEME =
    import.meta.env.VITE_REVERB_SCHEME ||
    import.meta.env.REVERB_SCHEME ||
    "http";
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${import.meta.env.VITE_APP_URL || window.location.origin}/api`;

  const explicitAuth = import.meta.env.VITE_BROADCAST_AUTH_ENDPOINT;
  const authEndpoint =
    explicitAuth || `${API_BASE.replace(/\/$/, "")}/broadcasting/auth`;

  if (!REVERB_KEY) {
    console.warn(
      "[Echo] Reverb app key missing. Real-time features will be disabled.",
    );
    return null;
  }

  // Bearer token is optional (non-production/dev). Cookie-auth mode relies on credentials.
  const token = shouldUseBearerForRequest()
    ? localStorage.getItem("authToken")
    : null;
  const authHeaders = {
    Accept: "application/json",
    "X-Client-Platform": "web",
  };

  if (token) {
    authHeaders.Authorization = `Bearer ${token}`;
  }

  echoInstance = new Echo({
    broadcaster: "reverb",
    key: REVERB_KEY,
    wsHost: REVERB_HOST,
    wsPort: Number(REVERB_PORT),
    forceTLS: REVERB_SCHEME === "https",
    disableStats: true,
    authEndpoint: authEndpoint,
    withCredentials: true,
    auth: {
      headers: authHeaders,
    },
    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          const response = await api.post(
            "/broadcasting/auth",
            {
              socket_id: socketId,
              channel_name: channel.name,
            },
            {
            headers: {
                "X-Client-Platform": "web",
                Accept: "application/json",
                ...(localStorage.getItem("authToken") ? { Authorization: `Bearer ${localStorage.getItem("authToken")}` } : {})
              },
            },
          );

          callback(false, response.data);
        } catch (error) {
          callback(true, error?.response?.data || error);
        }
      },
    }),
  });

  try {
    const pusher = echoInstance.connector && echoInstance.connector.pusher;
    if (pusher && pusher.connection) {
      pusher.connection.bind("connected", () =>
        console.info("[Echo] connected"),
      );
      pusher.connection.bind("disconnected", () =>
        console.warn("[Echo] disconnected"),
      );
      pusher.connection.bind("error", (err) =>
        console.error("[Echo] connection error", err),
      );
    }
  } catch (err) {
    console.warn("[Echo] failed to attach pusher listeners", err);
  }

  return echoInstance;
};

/**
 * Disconnect and clear the singleton instance
 */
export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};

const createEcho = () => getEcho();

export default createEcho;
