import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { UsernameGate } from "@/components/UsernameGate";

import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Marquee Lining Calculator" },
      { name: "description", content: "Calculate marquee wall, roof, gable lining areas, panels and costs." },
      { property: "og:title", content: "Marquee Lining Calculator" },
      { name: "twitter:title", content: "Marquee Lining Calculator" },
      { property: "og:description", content: "Calculate marquee wall, roof, gable lining areas, panels and costs." },
      { name: "twitter:description", content: "Calculate marquee wall, roof, gable lining areas, panels and costs." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/771bacb1-e069-49ee-826c-0fcfe805f133/id-preview-4a630bdb--cb271295-f4e9-462d-97a6-b73f3c0a2b04.lovable.app-1776680885351.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/771bacb1-e069-49ee-826c-0fcfe805f133/id-preview-4a630bdb--cb271295-f4e9-462d-97a6-b73f3c0a2b04.lovable.app-1776680885351.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <UsernameGate />
      <Toaster />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-primary" />
          <span className="text-base font-semibold tracking-tight">Marquee Linings</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/" activeOptions={{ exact: true }} className="rounded px-3 py-1.5 text-muted-foreground hover:bg-muted [&.active]:bg-secondary [&.active]:text-foreground" activeProps={{ className: "active" }}>
            Projects
          </Link>
          <Link to="/calculator" className="rounded px-3 py-1.5 text-muted-foreground hover:bg-muted [&.active]:bg-secondary [&.active]:text-foreground" activeProps={{ className: "active" }}>
            Quick calc
          </Link>
          <Link to="/pricing" className="rounded px-3 py-1.5 text-muted-foreground hover:bg-muted [&.active]:bg-secondary [&.active]:text-foreground" activeProps={{ className: "active" }}>
            Pricing
          </Link>
        </nav>
      </div>
    </header>
  );
}
