import { useState, useCallback } from 'react';
import { Upload, Calendar, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HabitChecklist } from '../components/habits/HabitChecklist';
import { Timeline } from '../components/timeline/Timeline';
import { Button, Card, CardContent, CardHeader, CardTitle, Modal, useToast, Badge } from '../components/ui';
import { parseGoogleTimeline, mergeOverlappingBlocks, addCommuteBlocks } from '../utils/locationUtils';
import { GoogleTimelineData } from '../types';
import { useLocationTracking } from '../hooks/useLocationTracking';
import {
  initializeGoogleAuth,
  isApiReady,
  requestAccessToken,
  batchSyncToCalendar,
} from '../services/googleCalendar';

export function Dashboard() {
  const { state, addLocationBlocks, updateSettings, updateSyncStatus, markSynced } = useApp();
  const { addToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Location tracking
  const {
    isTracking,
    currentLocation,
    currentZone,
    error: locationError,
    lastUpdate,
    startTracking,
    stopTracking,
    refreshLocation,
  } = useLocationTracking();

  // Handle file import
  const handleFileImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setImporting(true);
      try {
        const text = await file.text();
        const data: GoogleTimelineData = JSON.parse(text);

        let blocks = parseGoogleTimeline(data, state.zones);
        blocks = mergeOverlappingBlocks(blocks);
        blocks = addCommuteBlocks(blocks);

        addLocationBlocks(blocks);
        addToast('success', `Imported ${blocks.length} location blocks`);
        setShowImportModal(false);
      } catch (error) {
        console.error('Import error:', error);
        addToast('error', 'Failed to import file. Make sure it\'s a valid Google Timeline export.');
      } finally {
        setImporting(false);
        // Reset the input
        event.target.value = '';
      }
    },
    [state.zones, addLocationBlocks, addToast]
  );

  // Handle sync to Google Calendar
  const handleSync = useCallback(async () => {
    if (!state.settings.googleCalendarConnected) {
      // Try to connect first
      try {
        if (!isApiReady()) {
          await initializeGoogleAuth();
        }
        const tokenResponse = await requestAccessToken();
        updateSettings({
          googleCalendarConnected: true,
          googleAccessToken: tokenResponse.access_token,
        });
        addToast('success', 'Connected to Google Calendar');
      } catch (error) {
        console.error('Auth error:', error);
        addToast('error', 'Failed to connect to Google Calendar');
        return;
      }
    }

    setSyncing(true);
    updateSyncStatus({ syncInProgress: true });

    try {
      const zoneMap = new Map(
        state.zones.map((z) => [z.id, { activity: z.activity }])
      );

      const unsyncedBlocks = state.locationBlocks.filter((b) => !b.synced);
      const unsyncedCompletions = state.habitCompletions.filter((c) => !c.synced);

      const result = await batchSyncToCalendar(
        unsyncedBlocks,
        unsyncedCompletions,
        state.habits,
        zoneMap,
        state.settings.calendarId || 'primary',
        (current, total) => {
          // Progress callback if needed
        }
      );

      if (result.success) {
        markSynced(
          unsyncedBlocks.map((b) => b.id),
          unsyncedCompletions.map((c) => c.id)
        );
        addToast('success', `Synced ${result.syncedCount} events to Google Calendar`);
      } else {
        addToast('warning', `Synced with ${result.errors.length} errors`);
      }

      updateSyncStatus({
        syncInProgress: false,
        lastSyncTime: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Sync error:', error);
      addToast('error', 'Failed to sync to Google Calendar');
      updateSyncStatus({ syncInProgress: false, error: 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  }, [state, updateSettings, updateSyncStatus, markSynced, addToast]);

  const pendingSync = state.syncStatus.pendingEvents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Track your habits and locations in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            icon={<Upload className="w-4 h-4" />}
          >
            Import
          </Button>
          <Button
            onClick={handleSync}
            loading={syncing}
            icon={<Calendar className="w-4 h-4" />}
            disabled={pendingSync === 0 && state.settings.googleCalendarConnected}
          >
            {state.settings.googleCalendarConnected
              ? pendingSync > 0
                ? `Sync (${pendingSync})`
                : 'Synced'
              : 'Connect Calendar'}
          </Button>
        </div>
      </div>

      {/* Location Tracking Status */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isTracking ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {isTracking ? (
                  <Navigation className="w-5 h-5" />
                ) : (
                  <MapPin className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {isTracking ? 'Location Tracking Active' : 'Location Tracking Off'}
                  </span>
                  {isTracking && (
                    <Badge variant="success" size="sm">Live</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {locationError ? (
                    <span className="text-red-500">{locationError}</span>
                  ) : currentZone ? (
                    <>Currently at: <strong>{currentZone.name}</strong> ({currentZone.activity})</>
                  ) : currentLocation ? (
                    <>Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)} (not in a defined zone)</>
                  ) : (
                    'Enable to auto-track your location'
                  )}
                </p>
                {lastUpdate && (
                  <p className="text-xs text-muted-foreground">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isTracking && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshLocation}
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  Refresh
                </Button>
              )}
              <Button
                variant={isTracking ? 'outline' : 'primary'}
                size="sm"
                onClick={() => {
                  if (isTracking) {
                    stopTracking();
                    updateSettings({ autoLocationTracking: false });
                    addToast('info', 'Location tracking stopped');
                  } else {
                    startTracking();
                    updateSettings({ autoLocationTracking: true });
                    addToast('success', 'Location tracking started');
                  }
                }}
              >
                {isTracking ? 'Stop Tracking' : 'Start Tracking'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline - takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline date={selectedDate} onDateChange={setSelectedDate} />
            </CardContent>
          </Card>
        </div>

        {/* Habit checklist - sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="pt-6">
              <HabitChecklist />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Import modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Location Data"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Import your Google Timeline export to automatically create location blocks.
          </p>

          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop a JSON file here, or click to select
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
              id="file-upload"
              disabled={importing}
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 text-sm cursor-pointer"
            >
              {importing ? 'Importing...' : 'Select File'}
            </label>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <h4 className="font-medium mb-2">How to export from Google Timeline:</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to timeline.google.com</li>
              <li>Click the gear icon and select "Export your data"</li>
              <li>Choose the date range you want</li>
              <li>Download the JSON file</li>
            </ol>
          </div>
        </div>
      </Modal>
    </div>
  );
}
