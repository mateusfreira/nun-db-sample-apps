# Time Tracker - NunDB Example

A real-time collaborative time tracking application built with NunDB. This example demonstrates how to create a simple but powerful time tracking app without any build process - just open the HTML file in your browser! The app uses NunDB directly from CDN, making it completely self-contained.

## Features

- ⏱️ **Real-time tracking**: Start, stop, and resume tasks with live timer updates
- 🤝 **Multi-user workspaces**: Create or join named workspaces for team collaboration
- 👥 **Collaborative**: Multiple users can see each other's tasks in real-time within the same workspace
- 📊 **Time accumulation**: Track total time spent across multiple sessions
- 💾 **Persistent storage**: Tasks are automatically saved and synchronized per workspace
- 🔗 **URL-based workspaces**: Share workspace URLs with team members for easy access

## How to Use

1. **Open the app**: Simply open `index.html` in your web browser (no installation required!)
2. **Choose workspace**: Enter a unique workspace name (e.g., "my-team", "project-alpha") to create or join a collaborative session
3. **Share with team**: Share the URL with team members - everyone with the same workspace name will see the same tasks
4. **Start tracking**: Enter a task title and click "Start Task"
5. **Monitor progress**: Watch the timer count up in real-time
6. **Collaborate**: See tasks created by other team members and collaborate in real-time
7. **Stop/Resume**: Use the stop and resume buttons to control timing

> **Note**: The app loads NunDB directly from CDN, so you need an internet connection for it to work.

## What This Example Demonstrates

### NunDB Features Showcased

- **Real-time synchronization**: Tasks update across all connected clients instantly
- **Persistent storage**: Data is automatically saved and restored
- **Watch functionality**: Live updates when data changes
- **Conflict-free collaboration**: Multiple users can work simultaneously
- **CDN integration**: Loads NunDB directly from jsdelivr CDN

### Technical Implementation

- **Zero setup**: No local dependencies - everything loads from CDN
- **Connection management**: Handles connecting to NunDB and reconnection
- **Real-time updates**: Uses NunDB's watch feature for live data synchronization
- **Local state management**: Efficient client-side task management
- **Timer functionality**: Accurate time tracking with pause/resume capabilities

## Code Structure

```
time-tracker/
├── index.html          # Main HTML file with embedded CSS
├── app.js             # JavaScript application logic
└── README.md          # This documentation
```

### Key Components

1. **TimeTracker Class**: Main application class handling all functionality
2. **Database Connection**: Connects to NunDB staging server
3. **Task Management**: Create, start, stop, resume, and delete tasks
4. **Real-time UI**: Live timer updates and collaborative features
5. **Responsive Design**: Mobile-friendly interface

## Database Schema

Tasks are stored as an array in workspace-specific keys (e.g., `tasks_my-team`, `tasks_project-alpha`) with the following structure:

```javascript
{
  id: "task_1234567890_abc12",      // Unique task identifier
  title: "Review code",             // Task description
  status: "running",                // "running" or "stopped"
  startTime: 1640995200000,         // When current session started
  endTime: null,                    // When current session ended (if stopped)
  totalTime: 3600000,               // Total accumulated time (ms)
  createdBy: "user_abc123",         // User who created the task
  createdAt: 1640995200000          // Task creation timestamp
}
```

## Customization

You can easily customize this example:

- **Change database**: Update the connection URL in `app.js`
- **Modify styling**: Edit the embedded CSS in `index.html`
- **Add features**: Extend the TimeTracker class with new functionality
- **Change data structure**: Modify the task schema as needed

## Real-time Collaboration

This app showcases NunDB's real-time capabilities with workspace isolation:

1. Open the app in multiple browser tabs or share the URL with team members
2. Enter the same workspace name to join the collaborative session
3. Create a task in one tab/browser and watch it appear instantly in others
4. Start/stop tasks and see the changes propagate immediately across all participants
5. All users in the same workspace see the same synchronized state
6. Different workspaces are completely isolated from each other


## Next Steps (If you want to move beyond this example)

Try extending this example with:
- Task categories or tags
- Time reports and analytics
- Export functionality
- User authentication
- Task assignments
- Pomodoro timer integration
