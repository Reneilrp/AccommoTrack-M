import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const createEcho = async () => {
    const token = await AsyncStorage.getItem('auth_token');

    return new Echo({
        broadcaster: 'reverb',
        key: 'w4k7x9m2p5n8v3b6',
        wsHost: '192.168.43.84',
        wsPort: 8080,
        forceTLS: false,
        disableStats: true,
        authEndpoint: 'http://192.168.43.84:8000/api/broadcasting/auth',
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
};

export default createEcho;