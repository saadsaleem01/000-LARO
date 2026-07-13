/**
 * Full LARO web dashboard (cases, lawyers, evidence, outreach) — same surface area
 * as the deployed app at https://lawyerdashboard.manus.space
 */
import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useAuth } from "@/_core/hooks/useAuth";
import AuthPage from "@/components/AuthPage";
import { DashboardSkeleton } from "@/components/SkeletonLoaders";
import Home from "@/components/Home";
import Cases from "@/components/Cases";
import Lawyers from "@/components/Lawyers";
import Help from "@/components/Help";
import Settings from "@/components/Settings";
import Privacy from "@/components/Privacy";
import Admin from "@/components/Admin";
import AdminAnalytics from "@/components/AdminAnalytics";
import LawyerProfile from "@/components/LawyerProfile";
import Messages from "@/components/Messages";
import RoutePlaceholder from "@/components/RoutePlaceholder";

const fileProtocol =
  typeof window !== "undefined" && window.location.protocol === "file:";

export default function DashboardApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Router {...(fileProtocol ? { hook: useHashLocation } : {})}>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/cases" component={Cases} />
      <Route path="/lawyers/:id">
        <LawyerProfile />
      </Route>
      <Route path="/lawyers" component={Lawyers} />
      <Route path="/evidence">
        <RoutePlaceholder title="Evidence is now inside each case" />
      </Route>
      <Route path="/help" component={Help} />

      <Route path="/settings" component={Settings} />
      {/* EmailSettings.tsx is incomplete in repo; use main Settings until restored */}
      <Route path="/email-settings" component={Settings} />
      <Route path="/email-preferences" component={Settings} />
      <Route path="/privacy" component={Privacy} />

      <Route path="/admin" component={Admin} />
      <Route path="/admin-analytics" component={AdminAnalytics} />

      <Route path="/messages" component={Messages} />
      <Route path="/email" component={Messages} />
      <Route path="/email-automation">
        <RoutePlaceholder title="Email automation" />
      </Route>
      <Route path="/analytics">
        <RoutePlaceholder title="Analytics" />
      </Route>
      <Route path="/billing">
        <RoutePlaceholder title="Billing" />
      </Route>
      <Route path="/reports">
        <RoutePlaceholder title="Reports" />
      </Route>

      <Route>
        <div className="p-8 text-center text-muted-foreground">
          <p className="font-medium text-foreground">Page not found</p>
          <p className="mt-2 text-sm">Use the sidebar to navigate.</p>
        </div>
      </Route>
    </Switch>
    </Router>
  );
}
