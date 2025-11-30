// resources/js/Pages/Home.tsx

import React, { useState } from "react";
import { Head } from "@inertiajs/react";
import axios from "axios";

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
    const [email, setEmail] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setError("");
        setLoading(true);

        try {
            const response = await axios.post("/api/login/magic-link", {
                email,
            });

            setMessage(
                response.data.message ||
                    "Link inviato con successo. Controlla la tua casella email.",
            );
            setEmail("");
        } catch (err) {
            const axiosError = err as {
                response?: { data?: { message?: string } };
            };
            setError(
                axiosError.response?.data?.message ||
                    "Si è verificato un errore durante l'invio del link.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head title="Accedi con Magic Link" />
            <div>
                <h1>Accedi alla Chat</h1>

                {message && <p>{message}</p>}
                {error && <p>{error}</p>}

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Inserisci la tua email"
                        required
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? "Invio..." : "Ricevi Link d'Accesso"}
                    </button>
                </form>
            </div>
        </>
    );
};

export default Home;
