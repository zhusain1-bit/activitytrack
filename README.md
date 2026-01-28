# ActivityTrack

A web application that combines automatic location-based time tracking with manual habit logging, then automatically syncs everything to Google Calendar.

## Features

### Habit Tracking
- Real-time habit check-offs with visual feedback
- Support for positive habits and avoidance tracking
- Streak counting and progress visualization
- Scheduled habits with overdue indicators
- Notes for each habit completion

**Default Habits:**
- 8:30 AM Wake
- Gym
- 30-Min Meditation
- 30 Min Jobs (job applications/searching)
- Practice Flashcards
- Night Prayer
- Run
- Weed (avoidance)
- Alcohol (avoidance)
- P (avoidance)

### Location Zones
- Define location zones with GPS coordinates and radius
- Categories: Work, Home, Exercise, Social, Commute, Other
- Automatic categorization when importing location data
- Map integration with Google Maps links

### Google Calendar Integration
- OAuth integration with Google Calendar API
- Automatic event creation for habits and locations
- Color-coded events by category
- Sync status tracking with pending events counter
- Support for multiple calendars

### Google Timeline Import
- Import Google Timeline JSON exports
- Automatic parsing of place visits and activity segments
- Merge overlapping location blocks
- Auto-generate commute blocks between locations

### Analytics & Insights
- Weekly comparison charts
- Time distribution pie charts by category
- Habit performance tracking with completion rates
- Streak heatmap calendar
- Pattern detection and insights
- Avoidance tracking with "days clean" counter

### Settings
- Google Calendar connection management
- Theme selection (Light/Dark/System)
- Habit management (add/edit/archive)
- Data export/import (JSON backup)
- Default duration configuration

## Tech Stack

- **Frontend:** React 19 with TypeScript
- **Styling:** Tailwind CSS 4
- **Routing:** React Router 7
- **Charts:** Recharts
- **Icons:** Lucide React
- **Date Handling:** date-fns
- **Build Tool:** Vite 7

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Copy `.env.example` to `.env` and add your credentials:

```
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_GOOGLE_API_KEY=your_api_key_here
```

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── habits/       # Habit checklist component
│   ├── layout/       # App layout with navigation
│   ├── timeline/     # Timeline view component
│   ├── ui/           # Reusable UI components
│   └── zones/        # Zone editor component
├── context/          # React context for app state
├── hooks/            # Custom React hooks
├── pages/            # Page components
├── services/         # Google Calendar API service
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Data Structure

### Location Block
```json
{
  "id": "uuid",
  "location": "Olin Hall",
  "category": "Work",
  "startTime": "2025-01-27T09:00:00",
  "endTime": "2025-01-27T17:30:00",
  "calendarEventId": "abc123",
  "synced": true
}
```

### Habit Completion
```json
{
  "id": "uuid",
  "habitId": "habit-uuid",
  "timestamp": "2025-01-27T07:15:00",
  "duration": 30,
  "streak": 12,
  "notes": "Felt great today",
  "calendarEventId": "xyz789",
  "synced": true
}
```

## License

MIT
