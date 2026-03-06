# Live Poll - Real-Time Voting Application

A beautiful, real-time polling application built with NunDB that allows users to create instant polls and watch results update live as people vote.

## Features

- **Instant Poll Creation**: Create polls with custom questions and multiple options
- **Short Shareable URLs**: Each poll gets a unique 6-character ID for easy sharing
- **Real-Time Updates**: Watch results update instantly as votes come in
- **Beautiful Visualizations**: Animated progress bars show results with percentages
- **Multiple Choice Support**: Allow single or multiple selections per voter
- **Vote Tracking**: Prevents duplicate voting while maintaining anonymity
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Zero Setup**: Runs directly in the browser using NunDB CDN

## How It Works

### Creating a Poll

1. Open the application at the root URL
2. Enter your poll question (up to 200 characters)
3. Add 2-10 answer options
4. Configure settings:
   - Allow multiple selections
   - Show results after voting
5. Click "Create Poll" to generate a unique URL

### Voting

1. Share the generated URL (format: `?p=abc123`)
2. Voters select their choice(s)
3. Submit their vote
4. View live results (if enabled)

### Real-Time Features

- Vote counts update instantly for all viewers
- Progress bars animate smoothly as percentages change
- Live indicator shows active connection status
- Winner highlighting for options with most votes

## Technical Implementation

### NunDB Integration

```javascript
// Connection setup
const nundb = new NunDb({
    url: 'wss://ws-staging.nundb.org/',
    db: 'live-poll-demo',
    token: 'demo-token',
    user: `user_${Date.now()}_${Math.random()}`
});

// Store poll data
await nundb.set(`poll:${pollId}`, pollData);

// Watch for real-time updates
nundb.watch(`poll:${pollId}`, (data) => {
    updateResults(data.value);
});
```

### Data Structure

```javascript
{
    id: "abc123",
    question: "What's your favorite programming language?",
    options: [
        { id: 0, text: "JavaScript", votes: 42 },
        { id: 1, text: "Python", votes: 38 },
        { id: 2, text: "Rust", votes: 15 }
    ],
    settings: {
        allowMultiple: false,
        showResults: true
    },
    totalVotes: 95,
    voters: ["user_id_1", "user_id_2", ...],
    createdAt: 1234567890
}
```

## Key Features Explained

### Short URL Generation

Polls use a 6-character alphanumeric ID for easy sharing:
- Format: `yoursite.com/live-poll/?p=abc123`
- Memorable and easy to type
- Collision-resistant random generation

### Vote Prevention

- Uses localStorage to track user ID
- Prevents duplicate voting per browser
- Maintains voter anonymity (only stores anonymous IDs)

### Real-Time Synchronization

- All viewers see the same results
- Updates propagate within milliseconds
- Handles concurrent votes gracefully

### Responsive Design

- Mobile-first approach
- Touch-friendly voting interface
- Adaptive layouts for all screen sizes

## Styling Features

- **Gradient backgrounds**: Eye-catching purple gradient
- **Smooth animations**: Bounce effects, progress bar transitions
- **Interactive elements**: Hover states, focus indicators
- **Toast notifications**: Non-intrusive feedback messages
- **Loading states**: Smooth transitions between pages

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Development

### Running Locally

1. Clone the repository
2. Serve the files using any static server:
   ```bash
   python -m http.server 8000
   # or
   npx serve live-poll
   ```
3. Open `http://localhost:8000`

### Customization

- **Colors**: Modify CSS variables in `:root`
- **Animations**: Adjust keyframes and transitions
- **Limits**: Change max options, character limits in `app.js`
- **Database**: Update NunDB connection settings

## Use Cases

- **Team Decisions**: Quick polls for meeting decisions
- **Event Planning**: Vote on dates, venues, or activities
- **Feedback Collection**: Instant audience polling
- **Educational**: Classroom quizzes and surveys
- **Social**: Fun polls for friends and communities

## Security Considerations

- No personal data collection
- Anonymous voting system
- Client-side vote validation
- Rate limiting through NunDB

## Future Enhancements

- [ ] Poll expiration dates
- [ ] Password-protected polls
- [ ] Export results to CSV/JSON
- [ ] Poll templates
- [ ] Emoji reactions
- [ ] Comment threads
- [ ] Analytics dashboard
- [ ] QR code generation

## Credits

Built with:
- [NunDB](https://github.com/mateusfreira/nun-db) - Real-time database
- Pure JavaScript (no frameworks)
- Modern CSS with animations
- Love for beautiful, functional design ❤️