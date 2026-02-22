import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthStore = {
    token: string | null;
    setToken: (token: string | null) => void;
};

export const authStore = create(
    persist<AuthStore>(
        (set) => ({
            token: null,
            setToken: (token: string | null) => set({ token }),
        }),
        { name: "auth" },
    ),
)();
