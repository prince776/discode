import axios from 'axios';
import { baseURL } from '../config/config';

const API = axios.create({
    baseURL: baseURL
});

export default API;
