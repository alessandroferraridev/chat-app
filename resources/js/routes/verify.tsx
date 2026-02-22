import { Head, router } from "@inertiajs/react";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useEffect } from "react";
import Wrapper from "../components/wrapper";

interface VerifyProps {
  token: string;
}

type VerifyResponse = {
  message: string;
};

const VerifyPage: React.FC<VerifyProps> = ({ token }) => {
  const { isLoading, isError, isSuccess } = useQuery<
    VerifyResponse,
    AxiosError<{ message?: string; errors?: Record<string, string[]> }>
  >({
    queryKey: ["verify-token", token],
    queryFn: async () => {
      const response = await axios.post<VerifyResponse>(`/auth/verify/${token}`);
      return response.data;
    },
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (isSuccess) {
      router.visit("/chat");
    }
  }, [isSuccess]);

  return (
    <Wrapper>
      <Head title="Verify" />

      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Verifica accesso</h1>

        {isLoading && (
          <div className="mt-6 flex items-center gap-3 text-sm text-slate-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            Verifica del link in corso...
          </div>
        )}

        {!isLoading && isError && (
          <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Verifica non riuscita. Riprova.
          </p>
        )}
      </section>
    </Wrapper>
  );
};

export default VerifyPage;
