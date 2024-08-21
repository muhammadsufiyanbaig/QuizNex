import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'https://backend-quizwiz.vercel.app', 
  timeout: 10000, 
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, 
});

export default axiosInstance;