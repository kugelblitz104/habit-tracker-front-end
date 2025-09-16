import Axios from 'axios';

export const api = Axios.create({
    baseURL: 'http://localhost:8000/',
    timeout: 1000
});

api.interceptors.response.use(
    (response) => {
        console.log('intercepted!');
        return response.data;
    },
    (error) => {
        const message = error.response?.data?.message || 'An error occurred';
        return Promise.reject(error);
    }
);
