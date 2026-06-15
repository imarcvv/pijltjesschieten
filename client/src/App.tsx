import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Demo from "./pages/Demo";
import MobileBlaas from "./pages/MobileBlaas";
import { trpc } from "./lib/trpc";

/** Show the minimal mobile shoot view on small touch screens */
function useMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 768 && "ontouchstart" in window;
}

function MaintenancePage() {
  return (
    <div style={{
      minHeight: "100vh", background: "#fff3a0",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "Verdana, Tahoma, Arial, sans-serif", textAlign: "center", padding: 24,
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
      <div style={{
        background: "#003399", color: "#fff",
        padding: "6px 20px", fontSize: 22, fontWeight: "bold", marginBottom: 16,
        letterSpacing: 2,
      }}>PIJLTJESSCHIETEN.NL</div>
      <div style={{ fontSize: 18, fontWeight: "bold", color: "#003399", marginBottom: 8 }}>
        De site is momenteel even offline.
      </div>
      <div style={{ fontSize: 13, color: "#555", maxWidth: 360 }}>
        We zijn zo terug! Kom later nog eens langs om je pijltje te schieten.
      </div>
    </div>
  );
}

function Router() {
  const isMobile = useMobile();
  const { data: siteStatus, isLoading } = trpc.site.isActive.useQuery();

  // While loading, show nothing (avoids flash)
  if (isLoading) return null;

  // Admin route is always accessible regardless of site status
  const isAdmin = window.location.pathname === "/admin";
  if (!siteStatus?.active && !isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <Switch>
      <Route path="/" component={isMobile ? MobileBlaas : Home} />
      <Route path="/admin" component={Admin} />
      <Route path="/demo" component={Demo} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
