import "./bootstrap";

import { createInertiaApp } from "@inertiajs/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";

const appName = import.meta.env.VITE_APP_NAME;

const queryClient = new QueryClient();

createInertiaApp({
  title: (title) => `${title} | ${appName}`,
  resolve: (name) =>
    resolvePageComponent(
      `./routes/${name}.tsx`,
      import.meta.glob("./routes/**/*.tsx"),
    ),
  setup({ el, App, props }) {
    const root = createRoot(el);

    root.render(
      <QueryClientProvider client={queryClient}>
        <App {...props} />
      </QueryClientProvider>,
    );
  },
  progress: {
    color: "#4B5563",
  },
});
