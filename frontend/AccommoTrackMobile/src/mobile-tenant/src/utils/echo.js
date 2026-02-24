import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ECHO_HOST, ECHO_PORT, ECHO_AUTH_ENDPOINT } from '../../../config';

window.Pusher = Pusher;

const createEcho = async () => {
        // Prefer token stored on the `user` object
        let token = null;
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                token = user?.token || null;
            } catch (e) {}
        }
        if (!token) token = await AsyncStorage.getItem('token');

    return new Echo({
        broadcaster: 'reverb',
        key: 'w4k7x9m2p5n8v3b6',
        wsHost: ECHO_HOST,
        wsPort: ECHO_PORT,
        forceTLS: false,
        disableStats: true,
        authEndpoint: ECHO_AUTH_ENDPOINT,
        auth: {
            headers: {
                    Authorization: token ? `Bearer ${token}` : undefined,
            },
        },
    });
};

export default createEcho;