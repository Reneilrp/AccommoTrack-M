import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const createEcho = async () => {
    const token = await AsyncStorage.getItem('auth_token');

    return new Echo({
        broadcaster: 'reverb',
        key: 'w4k7x9m2p5n8v3b6',
        wsHost: '10.251.236.156',
        wsPort: 8080,
        forceTLS: false,
        disableStats: true,
        authEndpoint: 'http://10.251.236.156:8000/api/broadcasting/auth',
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
};

export default createEcho;