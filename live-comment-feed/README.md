# Live Comment Feed - NunDB Sample App

A real-time comment system with approval workflow and instant likes, built with NunDB for live data synchronization.

## Features

### 🔒 **Approval System**
- Comments start as "pending" and require admin approval
- Only approved comments appear in the public feed
- Real-time filtering ensures unapproved content stays hidden

### ❤️ **Instant Likes**
- Likes update immediately when clicked (optimistic UI)
- Real-time synchronization across all users
- User-specific like tracking

### 🔴 **Live Real-time Updates**
- New comments appear instantly for moderators
- Approved comments show immediately for all users
- Live connection status indicator

### 👤/🛡️ **Dual Mode Interface**
- **User Mode**: Clean feed view with comment submission
- **Admin Mode**: Moderation panel with pending queue and approval controls

### 📱 **Responsive Design**
- Mobile-friendly interface
- Adaptive layouts for different screen sizes

## Quick Start

1. **Open the application**
   ```bash
   # Navigate to the live-comment-feed directory and open index.html
   open index.html
   ```

2. **Join a feed**
   - Enter a feed ID (e.g., "tech-discussion")
   - Click "Join Feed" or use quick access buttons

3. **Start commenting**
   - Enter your name and message
   - Comments require approval before appearing

4. **Switch to admin mode** (optional)
   - Click "User Mode" button to toggle to "Admin Mode"
   - Approve or reject pending comments

## Technical Implementation

### Data Structure in NunDB
```javascript
// Comments with approval status
feed:{feedId}:comments = {
  comment_id: {
    id: string,
    author: string,
    message: string,
    timestamp: number,
    status: "pending" | "approved" | "rejected",
    likes: number,
    feedId: string,
    userId: string
  }
}

// Real-time like updates
feed:{feedId}:likes = {
  comment_id: {
    commentId: string,
    count: number
  }
}

// User-specific likes
feed:{feedId}:user_likes:{userId} = {
  comment_id: boolean
}

// Approval notifications
feed:{feedId}:approvals = {
  comment_id: {
    commentId: string,
    status: "approved" | "rejected"
  }
}
```

### Real-time Events
- **Comments**: Sync via NunDB watch() listeners
- **Likes**: Immediate updates with optimistic UI
- **Approvals**: Status changes broadcast to all connected clients

## Development

### Running Tests
```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with browser UI visible
npm run test:headed

# Debug tests step by step
npm run test:debug

# Interactive test UI
npm run test:ui

# Use the test runner script
./run-tests.sh
```

### Test Coverage
- ✅ NunDB connection and feed joining
- ✅ Comment posting and form validation
- ✅ Admin mode and moderation features
- ✅ Real-time synchronization
- ✅ Multi-user collaboration
- ✅ Responsive design
- ✅ Error handling

## Architecture

### Frontend Components
- **Setup Screen**: Feed selection and joining
- **Feed Interface**: Real-time comment display
- **Comment Input**: Form with validation and character counting
- **Admin Panel**: Moderation queue and controls
- **Like System**: Instant feedback with real-time sync

### NunDB Integration
- **Connection**: WebSocket to `wss://ws-staging.nundb.org/`
- **Database**: `live-comment-feed-demo`
- **Authentication**: Demo token
- **Real-time**: watch() method for live updates

## Browser Support

- ✅ Chrome/Chromium (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)  
- ✅ Safari/WebKit (Desktop & Mobile)
- ✅ Edge (Desktop)

## Security Features

- Input validation and sanitization
- XSS prevention with HTML escaping
- Rate limiting through UI controls
- Approval workflow for content moderation

## Performance

- Optimistic UI updates for likes
- Efficient real-time synchronization
- Minimal data transfer with targeted updates
- Responsive design with mobile optimization

## Contributing

1. Make changes to the application code
2. Run tests to ensure functionality: `npm test`
3. Test manually in browser for user experience
4. Update tests if adding new features

## Troubleshooting

### Connection Issues
- Check browser console for NunDB connection errors
- Verify internet connection
- Try refreshing the page

### Tests Failing
- Ensure NunDB staging server is accessible
- Check if all dependencies are installed: `npm install`
- Install Playwright browsers: `npx playwright install`

### Performance Issues
- Clear browser cache
- Check network connection stability
- Monitor browser developer tools for errors

---

Built with ❤️ using [NunDB](https://github.com/mateusfreira/nun-db) - The real-time database that rocks! 🚀