import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import MarketsPage from "./pages/MarketsPage";
import MarketDetailPage from "./pages/MarketDetailPage";
import DashboardPage from "./pages/DashboardPage";
import CreateMarketPage from "./pages/CreateMarketPage";
import DocsPage from "./pages/DocsPage";
import NotFound from "./pages/NotFound";
import { RefreshProvider } from "./context/RefreshContext";
import { SidebarProvider } from "./context/SidebarContext";
import { MarketRealtimeProvider } from "./components/providers/MarketRealtimeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MarketRealtimeProvider>
      <RefreshProvider>
        <SidebarProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/markets" element={<MarketsPage />} />
                <Route path="/market/:id" element={<MarketDetailPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/create" element={<CreateMarketPage />} />
                <Route path="/docs" element={<DocsPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SidebarProvider>
      </RefreshProvider>
    </MarketRealtimeProvider>
  </QueryClientProvider>
);

export default App;
