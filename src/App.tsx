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
import Companies from "./pages/Companies";
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
import ErrorBoundary from "./components/ErrorBoundary";
import PublicLayout from "./components/layouts/PublicLayout";
import DashboardLayout from "./components/layouts/DashboardLayout";
import ProtectedRoute from "./components/layouts/ProtectedRoute";


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
        <ErrorBoundary>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/transparency" element={<Transparency />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/checkout" element={<ErrorBoundary><Checkout /></ErrorBoundary>} />
            </Route>

            {/* Authenticated app shell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                <Route path="/world-monitor" element={<ErrorBoundary><WorldMonitor /></ErrorBoundary>} />
                <Route path="/companies" element={<ErrorBoundary><Companies /></ErrorBoundary>} />
                <Route path="/company/:id" element={<ErrorBoundary><CompanyDetail /></ErrorBoundary>} />
                <Route path="/watchlist" element={<ErrorBoundary><Watchlist /></ErrorBoundary>} />
                <Route path="/portfolio" element={<ErrorBoundary><Transparency /></ErrorBoundary>} />
                <Route path="/boardroom" element={<ErrorBoundary><Briefings /></ErrorBoundary>} />
                <Route path="/briefings" element={<ErrorBoundary><Briefings /></ErrorBoundary>} />
                <Route path="/resources" element={<ErrorBoundary><Resources /></ErrorBoundary>} />
                <Route path="/resources/:id" element={<ErrorBoundary><ResourceDetail /></ErrorBoundary>} />
                <Route path="/orders" element={<ErrorBoundary><OrderHistory /></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                <Route path="/admin" element={<ErrorBoundary><Admin /></ErrorBoundary>} />
                <Route path="/admin/regime" element={<ErrorBoundary><RegimeAdmin /></ErrorBoundary>} />
                <Route path="/admin/signals" element={<ErrorBoundary><SignalsAdmin /></ErrorBoundary>} />
                <Route path="/admin/catalysts" element={<ErrorBoundary><CatalystsAdmin /></ErrorBoundary>} />
                <Route path="/admin/macro" element={<ErrorBoundary><MacroAdmin /></ErrorBoundary>} />
                <Route path="/admin/security" element={<ErrorBoundary><AdminSecurity /></ErrorBoundary>} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>

        </ErrorBoundary>
        <DisclaimerFooter />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
