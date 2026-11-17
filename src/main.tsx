import "@fontsource/cal-sans/400.css";
import "@fontsource/caveat/500.css";
import "./styles.css";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const Admin = lazy(() => import("./Admin"));
const LogoLab = lazy(() => import("./LogoLab"));
const convexUrl: string | undefined = import.meta.env.VITE_CONVEX_URL;
const root = createRoot(document.getElementById("root")!);

if (!convexUrl) {
  root.render(<p style={{ padding: 24 }}>VITE_CONVEX_URL is not set. Run `npx convex dev` first.</p>);
} else {
  const convex = new ConvexReactClient(convexUrl);
  root.render(
    <StrictMode>
      <ConvexProvider client={convex}>
        {import.meta.env.DEV && location.pathname === "/logo" ? (
          <Suspense>
            <LogoLab />
          </Suspense>
        ) : location.pathname.startsWith("/admin") ? (
          <Suspense>
            <Admin />
          </Suspense>
        ) : (
          <App />
        )}
      </ConvexProvider>
    </StrictMode>,
  );
}
