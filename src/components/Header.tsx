import { useState } from 'react';
import { Search, Bell, User, Settings, LogOut, CreditCard, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './icons';
import { cn } from '../lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'success' | 'warning' | 'info';
}

const mockNotifications: Notification[] = [
  { id: '1', title: 'New lead assigned', message: 'John Smith from Acme Corp has been assigned to you', time: '5 min ago', read: false, type: 'info' },
  { id: '2', title: 'Deal won', message: 'TechStart Inc deal closed for $24,999', time: '1 hour ago', read: false, type: 'success' },
  { id: '3', title: 'Task overdue', message: 'Follow up with Global Solutions is overdue', time: '2 hours ago', read: true, type: 'warning' },
  { id: '4', title: 'Meeting reminder', message: 'Demo call with Innovate Co in 30 minutes', time: '3 hours ago', read: true, type: 'info' },
];

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-[70px] px-6 flex justify-between items-center border-b border-border bg-background relative">
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <label htmlFor="global-search" className="sr-only">Search</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} aria-hidden="true" />
          <input
            id="global-search"
            type="text"
            placeholder="Find anything... (Cmd+K)"
            aria-label="Search CRM"
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="h-9 w-9 flex items-center justify-center hover:bg-secondary rounded-lg transition-colors relative"
            aria-label="View notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Notifications</h3>
                    <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
                  </div>
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all as read
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-4 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer",
                          !notification.read && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                            notification.type === 'success' ? "bg-green-500" :
                            notification.type === 'warning' ? "bg-yellow-500" :
                            "bg-blue-500"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-border">
                  <button className="w-full text-sm text-primary hover:underline">
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 hover:ring-2 hover:ring-primary/20 transition-all"
            aria-label="User menu"
          />

          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
                    <div>
                      <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-secondary transition-colors text-left">
                    <User size={16} className="text-muted-foreground" />
                    <span className="text-sm">My Profile</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-secondary transition-colors text-left">
                    <Settings size={16} className="text-muted-foreground" />
                    <span className="text-sm">Settings</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-secondary transition-colors text-left">
                    <CreditCard size={16} className="text-muted-foreground" />
                    <span className="text-sm">Billing</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-secondary transition-colors text-left">
                    <HelpCircle size={16} className="text-muted-foreground" />
                    <span className="text-sm">Help & Support</span>
                  </button>
                </div>
                <div className="p-2 border-t border-border">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-secondary transition-colors text-left text-red-600"
                  >
                    <LogOut size={16} />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
