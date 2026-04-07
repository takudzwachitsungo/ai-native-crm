import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ChatAssistant } from './components/ChatAssistant';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { CommandPalette } from './components/CommandPalette';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Contacts from './pages/Contacts';
import Companies from './pages/Companies';
import Campaigns from './pages/Campaigns';
import Cases from './pages/Cases';
import Deals from './pages/Deals';
import Pipeline from './pages/Pipeline';
import Products from './pages/Products';
import Quotes from './pages/Quotes';
import Invoices from './pages/Invoices';
import Documents from './pages/Documents';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Email from './pages/Email';
import Reports from './pages/Reports';
import Forecasting from './pages/Forecasting';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import Login from './pages/Login';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    const handleOpenCommandPalette = () => {
      setIsCommandPaletteOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('crm:open-command-palette', handleOpenCommandPalette as EventListener);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('crm:open-command-palette', handleOpenCommandPalette as EventListener);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="flex h-screen overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 md:ml-[70px] overflow-y-auto bg-background">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/leads" element={<Leads />} />
                        <Route path="/contacts" element={<Contacts />} />
                        <Route path="/companies" element={<Companies />} />
                        <Route path="/campaigns" element={<Campaigns />} />
                        <Route path="/cases" element={<Cases />} />
                        <Route path="/deals" element={<Deals />} />
                        <Route path="/pipeline" element={<Pipeline />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/quotes" element={<Quotes />} />
                        <Route path="/invoices" element={<Invoices />} />
                        <Route path="/documents" element={<Documents />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/email" element={<Email />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/forecasting" element={<Forecasting />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/chat" element={<Chat />} />
                      </Routes>
                    </main>
                    <ChatAssistant />
                    {isAuthenticated && (
                      <CommandPalette
                        isOpen={isCommandPaletteOpen}
                        onClose={() => setIsCommandPaletteOpen(false)}
                      />
                    )}
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
