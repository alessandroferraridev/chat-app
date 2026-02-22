import { Head } from "@inertiajs/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import React from "react";
import z from "zod";
import Button from "../components/button";
import Input from "../components/input";
import Wrapper from "../components/wrapper";

interface LoginProps {}

const LoginPage: React.FC<LoginProps> = () => {
  const { mutateAsync: sendMagicLink, isSuccess, isError } = useMutation({
    mutationFn: (email: string) => axios.post("/api/auth/magic-link", { email }),
  });

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      await sendMagicLink(value.email);
    },
  });

  return (
    <Wrapper>
      <Head title="Login" />

      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Accedi</h1>
        <p className="mt-2 text-sm text-slate-600">Inserisci la tua email per ricevere un link magico.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="email"
            validators={{
              onSubmit: z.email("L'email non è valida").nonempty("L'email è obbligatoria"),
            }}
            children={(field) => {
              return (
                <div>
                  <label htmlFor={field.name} className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="nome@esempio.com"
                    autoComplete="email"
                    disabled={form.state.isSubmitting}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={`error-email-${error?.message}`} className="mt-2 text-sm text-rose-600">
                      {error?.message}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          {isSuccess && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Controlla la tua casella email: abbiamo inviato il link di accesso.
            </p>
          )}

          {isError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Si è verificato un errore durante l'invio del link. Riprova tra poco.
            </p>
          )}
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Invio in corso..." : "Invia link di accesso"}
              </Button>
            )}
          />
        </form>
      </section>
    </Wrapper>
  );
};

export default LoginPage;

