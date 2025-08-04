// lib/api.ts
import axios from "axios";

// Use environment variable for backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Example: GET /api/hello
export const getHello = async () => {
  const response = await api.get("/hello");
  return response.data;
};

// Example: GET /api/health
export const checkHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

// Example: GET /api/data
export const fetchData = async () => {
  const response = await api.get("/data");
  return response.data;
};

// Example: GET /api/user
export const getUser = async () => {
  const response = await api.get("/user");
  return response.data;
};
