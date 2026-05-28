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

/** Show the minimal mobile shoot view on small touch screens */
function useMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 768 && "ontouchstart" in window;
}

function Router() {
  const isMobile = useMobile();
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
