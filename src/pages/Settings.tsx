import { useState, useEffect } from 'react';
import {
  Calendar,
  Download,
  Upload,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Select,
  Toggle,
  Modal,
  Badge,
  useToast,
} from '../components/ui';
import { downloadBackup, importData } from '../utils/storage';
import {
  initializeGoogleAuth,
  isApiReady,
  requestAccessToken,
  revokeAccessToken,
  listCalendars,
} from '../services/googleCalendar';
import type { Habit } from '../types';

export function Settings() {
  const { state, updateSettings, importData: importAppData, addHabit, updateHabit, deleteHabit, archiveHabit } = useApp();
  const { settings, habits } = state;
  const { addToast } = useToast();

  const [calendars, setCalendars] = useState<{ id: string; summary: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitForm, setHabitForm] = useState({
    name: '',
    type: 'positive' as 'positive' | 'avoidance',
    scheduledTime: '',
    defaultDuration: 30,
  });

  // Load calendars if connected
  useEffect(() => {
    if (settings.googleCalendarConnected && settings.googleAccessToken) {
      loadCalendars();
    }
  }, [settings.googleCalendarConnected, settings.googleAccessToken]);

  const loadCalendars = async () => {
    try {
      if (!isApiReady()) {
        await initializeGoogleAuth();
      }
      const calendarList = await listCalendars();
      setCalendars(calendarList);
    } catch (error) {
      console.error('Failed to load calendars:', error);
    }
  };

  const handleConnectGoogle = async () => {
    setLoading(true);
    try {
      if (!isApiReady()) {
        await initializeGoogleAuth();
      }
      const tokenResponse = await requestAccessToken();
      updateSettings({
        googleCalendarConnected: true,
        googleAccessToken: tokenResponse.access_token,
      });
      await loadCalendars();
      addToast('success', 'Connected to Google Calendar');
    } catch (error) {
      console.error('Auth error:', error);
      addToast('error', 'Failed to connect to Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGoogle = () => {
    revokeAccessToken();
    updateSettings({
      googleCalendarConnected: false,
      googleAccessToken: undefined,
      googleRefreshToken: undefined,
      calendarId: undefined,
    });
    setCalendars([]);
    addToast('info', 'Disconnected from Google Calendar');
  };

  const handleExport = () => {
    downloadBackup(state);
    addToast('success', 'Data exported successfully');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = importData(text);
      if (data) {
        importAppData(data);
        addToast('success', 'Data imported successfully');
      } else {
        addToast('error', 'Invalid backup file');
      }
    } catch (error) {
      addToast('error', 'Failed to import data');
    }
    event.target.value = '';
  };

  const handleClearData = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme });

    // Apply theme
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  const handleSaveHabit = () => {
    if (!habitForm.name.trim()) {
      addToast('error', 'Habit name is required');
      return;
    }

    if (editingHabit) {
      updateHabit({
        ...editingHabit,
        name: habitForm.name,
        type: habitForm.type,
        scheduledTime: habitForm.scheduledTime || undefined,
        defaultDuration: habitForm.defaultDuration,
      });
      addToast('success', 'Habit updated');
    } else {
      addHabit({
        name: habitForm.name,
        type: habitForm.type,
        scheduledTime: habitForm.scheduledTime || undefined,
        defaultDuration: habitForm.defaultDuration,
        archived: false,
        order: habits.length,
      });
      addToast('success', 'Habit added');
    }

    setShowHabitModal(false);
    setEditingHabit(null);
    setHabitForm({
      name: '',
      type: 'positive',
      scheduledTime: '',
      defaultDuration: 30,
    });
  };

  const openEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setHabitForm({
      name: habit.name,
      type: habit.type,
      scheduledTime: habit.scheduledTime || '',
      defaultDuration: habit.defaultDuration,
    });
    setShowHabitModal(true);
  };

  const openAddHabit = () => {
    setEditingHabit(null);
    setHabitForm({
      name: '',
      type: 'positive',
      scheduledTime: '',
      defaultDuration: 30,
    });
    setShowHabitModal(true);
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const activeHabits = habits.filter((h) => !h.archived);
  const archivedHabits = habits.filter((h) => h.archived);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your ActivityTrack preferences
        </p>
      </div>

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Connect to automatically sync your habits and locations to Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.googleCalendarConnected ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
              </div>

              <Select
                label="Calendar"
                value={settings.calendarId || 'primary'}
                onChange={(value) => updateSettings({ calendarId: value })}
                options={[
                  { value: 'primary', label: 'Primary Calendar' },
                  ...calendars.map((c) => ({ value: c.id, label: c.summary })),
                ]}
              />

              <Toggle
                checked={settings.autoSync}
                onChange={(checked) => updateSettings({ autoSync: checked })}
                label="Auto-sync"
                description="Automatically sync new events to Google Calendar"
              />

              <Button variant="outline" onClick={handleDisconnectGoogle}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={handleConnectGoogle} loading={loading}>
              <Calendar className="w-4 h-4 mr-2" />
              Connect Google Calendar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Location Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Location Tracking</CardTitle>
          <CardDescription>
            Automatically track your location using browser geolocation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            checked={settings.autoLocationTracking}
            onChange={(checked) => updateSettings({ autoLocationTracking: checked })}
            label="Auto-track location"
            description="Automatically track your location and create location blocks when you enter defined zones"
          />
          <p className="text-sm text-muted-foreground">
            Make sure to define location zones in the Zones page for automatic categorization.
            Your browser will ask for permission to access your location.
          </p>
        </CardContent>
      </Card>

      {/* Owntracks Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Owntracks Integration</CardTitle>
          <CardDescription>
            Connect Owntracks mobile app for background location tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            checked={settings.owntracksEnabled}
            onChange={(checked) => updateSettings({ owntracksEnabled: checked })}
            label="Enable Owntracks"
            description="Receive location updates from the Owntracks mobile app"
          />

          {settings.owntracksEnabled && (
            <>
              <Input
                label="Webhook URL"
                value={settings.owntracksWebhookUrl || ''}
                onChange={(e) => updateSettings({ owntracksWebhookUrl: e.target.value })}
                placeholder="https://your-app.vercel.app/api/owntracks"
                helperText="URL where Owntracks sends location data"
              />

              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <h4 className="font-medium">Setup Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Install <a href="https://owntracks.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Owntracks</a> on your phone</li>
                  <li>Open Owntracks Settings → Connection</li>
                  <li>Set Mode to <strong>HTTP</strong></li>
                  <li>Set URL to: <code className="bg-muted px-1 rounded">{settings.owntracksWebhookUrl || 'your-webhook-url'}</code></li>
                  <li>Enable location tracking in Owntracks</li>
                </ol>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Habits Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Habits</CardTitle>
              <CardDescription>
                Manage your daily habits and tracking preferences
              </CardDescription>
            </div>
            <Button size="sm" onClick={openAddHabit} icon={<Plus className="w-4 h-4" />}>
              Add Habit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeHabits.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{habit.name}</span>
                  <Badge
                    variant={habit.type === 'avoidance' ? 'destructive' : 'success'}
                    size="sm"
                  >
                    {habit.type}
                  </Badge>
                  {habit.scheduledTime && (
                    <Badge variant="secondary" size="sm">
                      {habit.scheduledTime}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditHabit(habit)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => {
                      archiveHabit(habit.id);
                      addToast('info', 'Habit archived');
                    }}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Archive"
                  >
                    <Archive className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {archivedHabits.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Archived Habits
              </h4>
              <div className="space-y-2">
                {archivedHabits.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 opacity-60"
                  >
                    <span>{habit.name}</span>
                    <button
                      onClick={() => {
                        updateHabit({ ...habit, archived: false });
                        addToast('info', 'Habit restored');
                      }}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Restore"
                    >
                      <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how ActivityTrack looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleThemeChange(value as 'light' | 'dark' | 'system')}
                className={`
                  flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors
                  ${settings.theme === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
          <CardDescription>Default values for new habits and events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Default Habit Duration (minutes)"
            type="number"
            min="5"
            max="180"
            value={settings.defaultHabitDuration}
            onChange={(e) =>
              updateSettings({ defaultHabitDuration: parseInt(e.target.value) || 30 })
            }
          />
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Export, import, or clear your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport} icon={<Download className="w-4 h-4" />}>
              Export Data
            </Button>

            <label className="inline-flex items-center justify-center font-medium rounded-lg transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 text-sm gap-2 cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Upload className="w-4 h-4" />
              Import Data
            </label>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              variant="destructive"
              onClick={() => setShowClearConfirm(true)}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clear confirmation modal */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear All Data"
        size="sm"
      >
        <p className="text-muted-foreground mb-6">
          This will permanently delete all your habits, completions, locations, and settings.
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleClearData}>
            Clear All Data
          </Button>
        </div>
      </Modal>

      {/* Habit modal */}
      <Modal
        isOpen={showHabitModal}
        onClose={() => {
          setShowHabitModal(false);
          setEditingHabit(null);
        }}
        title={editingHabit ? 'Edit Habit' : 'Add Habit'}
      >
        <div className="space-y-4">
          <Input
            label="Habit Name"
            value={habitForm.name}
            onChange={(e) => setHabitForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Morning Meditation"
          />

          <Select
            label="Type"
            value={habitForm.type}
            onChange={(value) =>
              setHabitForm((prev) => ({ ...prev, type: value as 'positive' | 'avoidance' }))
            }
            options={[
              { value: 'positive', label: 'Positive (track to do)' },
              { value: 'avoidance', label: 'Avoidance (track to avoid)' },
            ]}
          />

          <Input
            label="Scheduled Time (optional)"
            type="time"
            value={habitForm.scheduledTime}
            onChange={(e) => setHabitForm((prev) => ({ ...prev, scheduledTime: e.target.value }))}
            helperText="Set a daily reminder time"
          />

          <Input
            label="Default Duration (minutes)"
            type="number"
            min="1"
            max="180"
            value={habitForm.defaultDuration}
            onChange={(e) =>
              setHabitForm((prev) => ({ ...prev, defaultDuration: parseInt(e.target.value) || 30 }))
            }
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowHabitModal(false);
                setEditingHabit(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveHabit}>
              {editingHabit ? 'Save Changes' : 'Add Habit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
