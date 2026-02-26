import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PendingApproval from './pages/PendingApproval';
import Dashboard from './pages/Dashboard';
import ProjectsList from './pages/ProjectsList';
import ProjectView from './pages/ProjectView';
import KanbanBoard from './pages/KanbanBoard';
import TaskKanban from './pages/TaskKanban';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import Settings from './pages/Settings';
import ChatPage from './pages/ChatPage';
import ChangePassword from './pages/ChangePassword';
import TicketList from './pages/tickets/TicketList';
import SubmitTicket from './pages/tickets/SubmitTicket';
import TicketDetail from './pages/tickets/TicketDetail';
import Layout from './components/Layout';
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from './components/ThemeProvider';
import { useChatStore } from './store/chatStore';
import api from './lib/api';
import RoleBasedRedirect from './components/RoleBasedRedirect';

function App() {
  const { token, initialize, user } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle global chat socket
  const { initSocket, rejoinRooms, socket, isConnected, disconnectSocket } = useChatStore();

  useEffect(() => {
    if (token && user?.id) {
      console.log('App: Initializing chat socket for user', user.id);
      initSocket(user.id);
    } else if (!token) {
      disconnectSocket();
    }
  }, [token, user?.id, initSocket, disconnectSocket]);

  useEffect(() => {
    if (socket && isConnected && token) {
      rejoinRooms(api);
    }
  }, [socket, isConnected, token, rejoinRooms]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="taskflow-theme">
      <Router>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={!token ? <Login /> : <RoleBasedRedirect />}
          />
          <Route
            path="/signup"
            element={!token ? <Signup /> : <RoleBasedRedirect />}
          />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/change-password" element={token ? <ChangePassword /> : <Navigate to="/login" />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={token ? <Layout /> : <Navigate to="/login" />}
          >
            <Route index element={<RoleBasedRedirect />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<ProjectsList />} />
            <Route path="projects/:id" element={<ProjectView />} />
            <Route path="kanban" element={<KanbanBoard />} />
            <Route path="task-board" element={<TaskKanban />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="team" element={<Team />} />
            <Route path="settings" element={<Settings />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="tickets" element={<TicketList />} />
            <Route path="tickets/new" element={<SubmitTicket />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;
