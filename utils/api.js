import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5175/api", // change if deployed
});

export default API;
