import axios from "axios";

const API = axios.create({
  baseURL: "https://backend-production-a6a3.up.railway.app/api",
});

export default API;
