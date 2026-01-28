import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  BarChart3,
  Settings,
  Calendar,
  Menu,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { state } = useApp();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/zones', icon: MapPin, label: 'Zones' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const pendingSync = state.syncStatus.pendingEvents;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
        <h1 className="text-lg font-semibold">ActivityTrack</h1>
        <div className="w-10" />
      </header>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-border">
            <Calendar className="w-6 h-6 text-primary mr-3" />
            <span className="text-lg font-semibold">ActivityTrack</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-3">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sync status */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending sync</span>
              <span
                className={`font-medium ${
                  pendingSync > 0 ? 'text-orange-500' : 'text-green-500'
                }`}
              >
                {pendingSync} events
              </span>
            </div>
            {state.settings.googleCalendarConnected && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Google Calendar connected</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
