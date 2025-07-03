import axios from "axios";

const API = axios.create({
  baseURL: "https://signee.netlify.app/api", // change if deployed
});

export default API;
