# Calendar Booking - Real-Time Professional Scheduling

A beautiful, real-time calendar booking system built with NunDB that enables professional service providers to manage appointments and allows clients to book available time slots with instant updates.

## Features

### 🏥 Multi-Professional Support
- **Professional Profiles**: Manage multiple professionals with individual schedules
- **Specialty Display**: Each professional has their specialty and availability status
- **Individual Working Hours**: Customizable working hours per professional
- **Availability Filtering**: Filter professionals by availability status

### 📅 Advanced Calendar Interface
- **Week & Day Views**: Switch between weekly overview and detailed daily view
- **Real-Time Availability**: Live updates of available and booked time slots
- **Visual Time Slots**: Color-coded slots (green=available, red=booked)
- **Today Highlighting**: Current day is visually highlighted
- **Smooth Navigation**: Easy week/day navigation with "Today" quick access

### ⚡ Real-Time Booking System
- **Instant Updates**: Bookings appear immediately across all connected clients
- **Live Status**: Connection status indicator shows real-time sync
- **Conflict Prevention**: Prevents double-booking with real-time validation
- **Professional Selection**: Select professional before booking

### 📋 Comprehensive Booking Form
- **Client Information**: Name, email, phone collection
- **Service Types**: Pre-defined service options with durations
  - Consultation (30 min)
  - Health Checkup (45 min)
  - Therapy Session (60 min)
  - Follow-up (15 min)
- **Notes Field**: Additional information and special requests
- **Form Validation**: Client-side and server-side validation

### 🎯 Smart Scheduling Features
- **Working Hours**: Respects individual professional schedules
- **Past Time Prevention**: Cannot book appointments in the past
- **Business Days**: Supports custom working days per professional
- **Appointment Details**: Click appointments to view full details

### 🎨 Beautiful Design
- **Modern Interface**: Clean, professional design with Inter font
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Smooth Animations**: Subtle transitions and hover effects
- **Color-Coded Status**: Intuitive visual indicators for all states
- **Accessibility**: Proper focus states and reduced motion support

## How It Works

### For Service Providers

1. **Professional Setup**: Each professional has their profile with working hours and specialties
2. **Calendar Management**: View weekly/daily schedules with all appointments
3. **Real-Time Updates**: See new bookings instantly as they come in
4. **Appointment Details**: Click any appointment to see client information

### For Clients

1. **Select Professional**: Choose from available professionals
2. **Pick Time Slot**: Click on green (available) time slots
3. **Fill Booking Form**: Provide contact info and service details
4. **Instant Confirmation**: Booking confirmed immediately with real-time updates

### Real-Time Features

- **Live Sync**: All changes sync instantly across all connected users
- **Connection Status**: Visual indicator shows real-time connection status
- **Conflict Prevention**: Automatic prevention of double-bookings
- **Multi-User Safe**: Multiple people can book simultaneously without conflicts

## Technical Implementation

### NunDB Integration

```javascript
// Real-time connection setup
const nundb = new NunDb({
    url: 'wss://ws-staging.nundb.org/',
    db: 'calendar-booking-demo',
    token: 'demo-token',
    user: `user_${Date.now()}_${Math.random()}`
});

// Watch for appointment changes
nundb.watch('appointment:', (data) => {
    updateCalendarDisplay(data.value);
});

// Save new appointment
await nundb.set(`appointment:${appointmentId}`, appointmentData);
```

### Data Structure

```javascript
// Professional Object
{
    id: 'prof_1',
    name: 'Dr. Sarah Johnson',
    specialty: 'Cardiologist',
    available: true,
    workingHours: { start: 9, end: 17 },
    workingDays: [1, 2, 3, 4, 5] // Monday to Friday
}

// Appointment Object
{
    id: 'apt_123',
    professionalId: 'prof_1',
    startTime: 1690876800000,
    endTime: 1690880400000,
    clientName: 'John Doe',
    clientEmail: 'john@example.com',
    serviceType: 'consultation',
    status: 'confirmed'
}
```

### Key Components

#### Calendar Grid System
- **Time Column**: Shows hourly slots from 9 AM to 5 PM
- **Day Columns**: Seven columns for week view, one for day view
- **Dynamic Rendering**: Calendar updates based on current week/day selection

#### Professional Management
- **Selection System**: Click to select professional for booking
- **Availability Display**: Real-time status indicators
- **Filter Options**: Show all professionals or available only

#### Booking Workflow
1. **Slot Selection**: Click available time slot
2. **Form Display**: Booking form appears with pre-filled time/professional
3. **Validation**: Client-side and server-side validation
4. **Confirmation**: Immediate booking confirmation with calendar update

## File Structure

```
calendar-booking/
├── index.html          # Main application layout
├── styles.css          # Complete styling with animations
├── app.js              # Core application logic and NunDB integration
├── package.json        # Dependencies and scripts
├── playwright.config.js # Test configuration
├── tests/              # Comprehensive test suite
│   ├── calendar-interface.spec.js    # UI and navigation tests
│   ├── booking-functionality.spec.js # Booking system tests
│   └── real-time-features.spec.js    # Real-time sync tests
└── README.md           # This documentation
```

## Development

### Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run serve
   ```

3. **Run Tests**:
   ```bash
   npm test                # Run all tests
   npm run test:headed     # Run with browser visible
   npm run test:ui         # Run with Playwright UI
   ```

### Testing

The application includes comprehensive tests covering:

- **Interface Tests**: Calendar display, navigation, professional selection
- **Booking Tests**: Form validation, appointment creation, user flows
- **Real-Time Tests**: Multi-user scenarios, live updates, connection handling

### Customization

#### Adding New Professionals

```javascript
// In app.js - loadProfessionals() method
{
    id: 'prof_new',
    name: 'Dr. New Professional',
    specialty: 'Specialty',
    avatar: 'NP',
    available: true,
    workingHours: { start: 9, end: 17 },
    workingDays: [1, 2, 3, 4, 5]
}
```

#### Modifying Working Hours

```javascript
// Change default working hours
this.workingHours = { start: 8, end: 18 }; // 8 AM to 6 PM
```

#### Adding New Service Types

```html
<!-- In index.html - serviceType select -->
<option value="new-service">New Service (X min)</option>
```

## Use Cases

### Healthcare Providers
- **Medical Practices**: Patient appointment scheduling
- **Dental Offices**: Procedure and consultation booking
- **Therapy Clinics**: Session scheduling with multiple therapists
- **Specialist Consultations**: Expert availability management

### Service Industries
- **Legal Consultations**: Lawyer availability and client meetings
- **Financial Advisory**: Meeting scheduling with advisors
- **Personal Training**: Trainer availability and session booking
- **Beauty Services**: Stylist and treatment appointment management

### Educational Services
- **Tutoring Centers**: Teacher availability and lesson scheduling
- **Music Lessons**: Instructor scheduling and student bookings
- **Language Classes**: Teacher availability and class scheduling
- **Academic Counseling**: Advisor meeting scheduling

## Browser Support

- **Chrome/Edge**: Latest versions
- **Firefox**: Latest versions  
- **Safari**: Latest versions
- **Mobile**: iOS Safari, Chrome Android

## Security & Privacy

- **No Personal Data Storage**: Client information is temporarily stored for booking
- **Secure Connections**: All data transmitted over secure WebSocket connections
- **Client-Side Validation**: Prevents invalid data submission
- **Real-Time Validation**: Prevents booking conflicts

## Future Enhancements

- [ ] **Recurring Appointments**: Weekly/monthly recurring bookings
- [ ] **Email Notifications**: Automatic booking confirmations
- [ ] **Calendar Export**: Export to Google Calendar, Outlook
- [ ] **Payment Integration**: Online payment processing
- [ ] **SMS Reminders**: Automated appointment reminders
- [ ] **Custom Service Types**: Admin panel for service management
- [ ] **Booking History**: Client and professional booking history
- [ ] **Advanced Filtering**: Filter by service type, duration, professional
- [ ] **Multi-Location Support**: Support for multiple office locations
- [ ] **API Integration**: REST API for external integrations

## Credits

Built with:
- [NunDB](https://github.com/mateusfreira/nun-db) - Real-time database and synchronization
- **Vanilla JavaScript** - No frameworks, pure performance
- **Modern CSS** - Grid, Flexbox, custom properties, animations
- **Inter Font** - Professional typography by Google Fonts
- **Playwright** - Comprehensive end-to-end testing
- Love for creating beautiful, functional applications ❤️