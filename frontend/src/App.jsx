import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// ── Eagerly loaded (needed immediately on every page load) ─────────────────
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from './components/ThemeProvider';
import { useChatStore } from './store/chatStore';
import api from './lib/api';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import Layout from './components/Layout';
import { useToast } from './hooks/use-toast';

// ── Lazy-loaded: Auth pages ────────────────────────────────────────────────
const Login = lazy(() => import('./components/forms/auth/Login'));
const Signup = lazy(() => import('./components/forms/auth/Signup'));
const ForgotPassword = lazy(() => import('./components/forms/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/forms/auth/ResetPassword'));
const ChangePassword = lazy(() => import('./components/forms/auth/ChangePassword'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));

// ── Lazy-loaded: Public / marketing pages ──────────────────────────────────
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Pricing = lazy(() => import('./pages/Pricing'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));

// ── Lazy-loaded: Main app pages ────────────────────────────────────────────
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProjectsList = lazy(() => import('./pages/ProjectsList'));
const ProjectView = lazy(() => import('./pages/ProjectView'));
const KanbanBoard = lazy(() => import('./pages/KanbanBoard'));
const TaskKanban = lazy(() => import('./pages/TaskKanban'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Team = lazy(() => import('./pages/Team'));
const Settings = lazy(() => import('./pages/Settings'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const Timesheets = lazy(() => import('./pages/Timesheets'));
const Performance = lazy(() => import('./pages/Performance'));
const OrganizationSettings = lazy(() => import('./pages/organization/OrganizationSettings'));
const ActivityLog = lazy(() => import('./pages/organization/ActivityLog'));
const Integrations = lazy(() => import('./pages/Integrations'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const RestrictedAccess = lazy(() => import('./pages/RestrictedAccess'));

// ── Lazy-loaded: Ticket pages ──────────────────────────────────────────────
const TicketList = lazy(() => import('./pages/tickets/TicketList'));
const SubmitTicket = lazy(() => import('./pages/tickets/SubmitTicket'));
const TicketDetail = lazy(() => import('./pages/tickets/TicketDetail'));

// ── Lazy-loaded: Superadmin pages ──────────────────────────────────────────
const SuperAdminLayout = lazy(() => import('./superadmin/components/SuperAdminLayout'));
const SuperAdminDashboard = lazy(() => import('./superadmin/pages/Dashboard'));
const OrgList = lazy(() => import('./superadmin/pages/OrgList'));
const SuperAdminUserList = lazy(() => import('./superadmin/pages/UserList'));
const AuditLog = lazy(() => import('./superadmin/pages/AuditLog'));
const PlatformSettings = lazy(() => import('./superadmin/pages/PlatformSettings'));
const SuperAdminBilling = lazy(() => import('./superadmin/pages/Billing'));
const PlansAndLimits = lazy(() => import('./superadmin/pages/PlansAndLimits'));

// ── Loading fallback component ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
          Loading…
        </p>
      </div>
    </div>
  );
}

// ── Guard — only SUPERADMIN can access /superadmin/* ───────────────────────
function SuperAdminGuard({ children }) {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'SUPERADMIN') return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Guard — protects routes based on Organization Features ───────────────
function FeatureGuard({ feature, children }) {
  const { user } = useAuthStore();

  const activeFeatures = user?.activeFeatures || user?.organization?.activeFeatures;

  // ── DEEP SYNC: Convert everything to lowercase to ensure absolute match ──────────
  if (activeFeatures) {
    const normalizedFeatures = {};
    Object.keys(activeFeatures).forEach(k => {
      normalizedFeatures[k.toLowerCase()] = activeFeatures[k];
    });

    // If explicitly disabled, show the Restricted Access page
    if (normalizedFeatures[feature.toLowerCase()] === false) {
      return <RestrictedAccess feature={feature} />;
    }
  }

  return children;
}

function App() {
  const { token, initialize, syncUser, user } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      const storedToken = initialize();
      if (storedToken || token) {
        await syncUser(api);
      }
    };
    init();
  }, [initialize, token, syncUser]);

  // ── Periodic re-sync: refresh user permissions every 5 minutes ──────────
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      syncUser(api);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, syncUser]);

  // Handle global chat socket
  // SUPERADMIN has no org so skip socket init for them
  const { initSocket, rejoinRooms, socket, isConnected, disconnectSocket } = useChatStore();

  useEffect(() => {
    if (token && user?.id) {
      // For SuperAdmins, organizationId will be null, which is now handled in server.js
      initSocket(user.id, user.organizationId);
    } else if (!token && isConnected) {
      disconnectSocket();
    }
  }, [token, user?.id, user?.organizationId, initSocket, disconnectSocket]);

  useEffect(() => {
    if (socket && isConnected && token && user?.role !== 'SUPERADMIN') {
      rejoinRooms(api);
    }
  }, [socket, isConnected, token, user?.role, rejoinRooms]);

  return (
    <ThemeProvider defaultTheme="light" storageKey="taskflow-theme">
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public routes ──────────────────────────────────── */}
            <Route
              path="/login"
              element={!token ? <Login /> : <RoleBasedRedirect />}
            />
            <Route
              path="/signup"
              element={!token ? <Signup /> : <RoleBasedRedirect />}
            />
            <Route
              path="/forgot-password"
              element={!token ? <ForgotPassword /> : <RoleBasedRedirect />}
            />
            <Route
              path="/reset-password/:token"
              element={!token ? <ResetPassword /> : <RoleBasedRedirect />}
            />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route
              path="/change-password"
              element={token ? <ChangePassword /> : <Navigate to="/login" />}
            />

            {/* ── Superadmin routes (SUPERADMIN only) ────────────── */}
            <Route
              path="/superadmin"
              element={
                <SuperAdminGuard>
                  <SuperAdminLayout />
                </SuperAdminGuard>
              }
            >
              <Route index element={<SuperAdminDashboard />} />
              <Route path="orgs" element={<OrgList />} />
              <Route path="users" element={<SuperAdminUserList />} />
              <Route path="audit" element={<AuditLog />} />
              <Route path="billing" element={<SuperAdminBilling />} />
              <Route path="plans" element={<PlansAndLimits />} />
              <Route path="settings" element={<PlatformSettings />} />
            </Route>

            {/* ── Public Landing Page ─────────────────────────────── */}
            <Route path="/" element={token ? <RoleBasedRedirect /> : <LandingPage />} />

            {/* ── Protected Routes ────────────────────────────────── */}
            <Route element={token ? <Layout /> : <Navigate to="/login" replace />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route
                path="projects"
                element={<FeatureGuard feature="projects"><ProjectsList /></FeatureGuard>}
              />
              <Route
                path="projects/:id"
                element={<FeatureGuard feature="projects"><ProjectView /></FeatureGuard>}
              />
              <Route
                path="kanban"
                element={<FeatureGuard feature="kanban"><KanbanBoard /></FeatureGuard>}
              />
              <Route
                path="task-board"
                element={<FeatureGuard feature="kanban"><TaskKanban /></FeatureGuard>}
              />
              <Route
                path="tasks"
                element={<FeatureGuard feature="tasks"><Tasks /></FeatureGuard>}
              />
              <Route
                path="team"
                element={<FeatureGuard feature="team"><Team /></FeatureGuard>}
              />
              <Route path="settings" element={<Settings />} />
              <Route
                path="timesheets"
                element={<FeatureGuard feature="timesheets"><Timesheets /></FeatureGuard>}
              />
              <Route
                path="performance"
                element={<FeatureGuard feature="performance"><Performance /></FeatureGuard>}
              />
              <Route
                path="chat"
                element={
                  <FeatureGuard feature="chat">
                    {user?.role !== 'CLIENT' ? <ChatPage /> : <Navigate to="/dashboard" />}
                  </FeatureGuard>
                }
              />
              <Route
                path="tickets"
                element={<FeatureGuard feature="tickets"><TicketList /></FeatureGuard>}
              />
              <Route
                path="tickets/new"
                element={<FeatureGuard feature="tickets"><SubmitTicket /></FeatureGuard>}
              />
              <Route
                path="tickets/:id"
                element={<FeatureGuard feature="tickets"><TicketDetail /></FeatureGuard>}
              />

              <Route
                path="organization"
                element={
                  user?.role === 'ADMIN'
                    ? <OrganizationSettings />
                    : <Navigate to="/dashboard" replace />
                }
              />
              <Route
                path="organization/activity-log"
                element={
                  user?.role === 'ADMIN'
                    ? <ActivityLog />
                    : <Navigate to="/dashboard" replace />
                }
              />
              <Route
                path="integrations"
                element={
                  ['ADMIN', 'MANAGER', 'MEMBER'].includes(user?.role)
                    ? <FeatureGuard feature="github"><Integrations /></FeatureGuard>
                    : <Navigate to="/dashboard" replace />
                }
              />
              <Route
                path="billing"
                element={
                  user?.role === 'ADMIN'
                    ? <BillingPage />
                    : <Navigate to="/dashboard" replace />
                }
              />
            </Route>

            {/* ── Catch all ───────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;