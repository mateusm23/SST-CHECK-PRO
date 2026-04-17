import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import AppLayout from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import PricingPage from "@/pages/pricing";
import InspectionPage from "@/pages/inspection";
import InspectionViewPage from "@/pages/inspection-view";
import TemplatesPage from "@/pages/templates";
import TemplateBuilderPage from "@/pages/template-builder";
import SettingsPage from "@/pages/settings";

// Páginas que usam o AppLayout (sidebar + nav)
function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={() => <AppLayout><DashboardPage /></AppLayout>} />
      <Route path="/dashboard" component={() => <AppLayout><DashboardPage /></AppLayout>} />
      <Route path="/templates" component={() => <AppLayout><TemplatesPage /></AppLayout>} />
      <Route path="/templates/new" component={() => <AppLayout><TemplateBuilderPage /></AppLayout>} />
      <Route path="/templates/:id/edit" component={() => <AppLayout><TemplateBuilderPage /></AppLayout>} />
      <Route path="/settings" component={() => <AppLayout><SettingsPage /></AppLayout>} />
      <Route path="/pricing" component={() => <AppLayout><PricingPage /></AppLayout>} />
      {/* Inspeções: tela cheia sem sidebar */}
      <Route path="/inspection/:id/view" component={InspectionViewPage} />
      <Route path="/inspection/:id" component={InspectionPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UnauthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route component={LandingPage} />
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f0f0]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD100]" />
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedRoutes /> : <UnauthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="sst-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
