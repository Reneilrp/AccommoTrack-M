import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const createEcho = () => {
    const token = localStorage.getItem('auth_token');
    
    return new Echo({
        broadcaster: 'reverb',
        key: 'w4k7x9m2p5n8v3b6',
        wsHost: '192.168.254.106',
        wsPort: 8080,
        forceTLS: false,
        disableStats: true,
        authEndpoint: 'http://192.168.254.106:8000/api/broadcasting/auth',
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
};

export default createEcho;