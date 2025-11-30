import axios, { type InternalAxiosRequestConfig } from "axios";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.axios = axios;

window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

window.axios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem("sanctum_token");

        if (token && config.headers) {
            config.headers.set("Authorization", `Bearer ${token}`);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);
/*
window.Pusher = Pusher;

window.Echo = new Echo({
    // Configurazione standard per Reverb
    broadcaster: "pusher",
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    wssPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
    enabledTransports: ["ws", "wss"],
    disableStats: true,

    auth: {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("sanctum_token")}`,
        },
    },
});
 */
