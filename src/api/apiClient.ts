import axios from 'axios';

export const apiClient = axios.create({
    baseURL: '/api',
});

// проверка токена  перед каждым запросом 
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});