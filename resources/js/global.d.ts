import { AxiosStatic } from "axios";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
    interface Window {
        axios: AxiosStatic;

        Echo: Echo;

        Pusher: typeof Pusher;
    }
}
