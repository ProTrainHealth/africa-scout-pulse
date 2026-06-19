import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTimeBasedTheme } from "@/hooks/useTimeBasedTheme";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import RegimeAdmin from "./pages/admin/RegimeAdmin";
import SignalsAdmin from "./pages/admin/SignalsAdmin";
import CatalystsAdmin from "./pages/admin/CatalystsAdmin";
import MacroAdmin from "./pages/admin/MacroAdmin";
import AdminSecurity from "./pages/admin/Security";
import Resources from "./pages/Resources";
import ResourceDetail from "./pages/ResourceDetail";
import Pricing from "./pages/Pricing";
import Checkout from "./pages/Checkout";
import OrderHistory from "./pages/OrderHistory";
import WorldMonitor from "./pages/WorldMonitor";
import CompanyDetail from "./pages/CompanyDetail";
import Watchlist from "./pages/Watchlist";
import Settings from "./pages/Settings";
import Transparency from "./pages/Transparency";
import Briefings from "./pages/Briefings";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import CommandPalette from "./components/CommandPalette";
import DisclaimerFooter from "./components/DisclaimerFooter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  useTimeBasedTheme();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CommandPalette />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/regime" element={<RegimeAdmin />} />
          <Route path="/admin/signals" element={<SignalsAdmin />} />
          <Route path="/admin/catalysts" element={<CatalystsAdmin />} />
          <Route path="/admin/macro" element={<MacroAdmin />} />
          <Route path="/admin/security" element={<AdminSecurity />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/resources/:id" element={<ResourceDetail />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/world-monitor" element={<WorldMonitor />} />
          <Route path="/company/:id" element={<CompanyDetail />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/transparency" element={<Transparency />} />
          <Route path="/briefings" element={<Briefings />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <DisclaimerFooter />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
