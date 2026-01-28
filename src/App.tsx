import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/ui';
import { Layout } from './components/layout/Layout';
import { Dashboard, Zones, Analytics, Settings } from './pages';
import { useEffect } from 'react';

function ThemeInitializer() {
  useEffect(() => {
    // Apply theme on initial load
    const stored = localStorage.getItem('activitytrack_data');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const theme = data.settings?.theme || 'system';
        const root = document.documentElement;

        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.toggle('dark', prefersDark);
        } else {
          root.classList.toggle('dark', theme === 'dark');
        }
      } catch {
        // Use system default
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      }
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem('activitytrack_data');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.settings?.theme === 'system') {
          document.documentElement.classList.toggle('dark', e.matches);
        }
      } else {
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return null;
}

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <ThemeInitializer />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="zones" element={<Zones />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
