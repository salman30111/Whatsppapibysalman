import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationProvider } from "@/contexts/notification-context";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import Contacts from "@/pages/contacts";
import Templates from "@/pages/templates";
import Messages from "@/pages/messages";
import BotRules from "@/pages/bot-rules";
import Logs from "@/pages/logs";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/campaigns" component={Campaigns} />
      <ProtectedRoute path="/contacts" component={Contacts} />
      <ProtectedRoute path="/templates" component={Templates} />
      <ProtectedRoute path="/messages" component={Messages} />
      <ProtectedRoute path="/bot-rules" component={BotRules} />
      <ProtectedRoute path="/logs" component={Logs} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
