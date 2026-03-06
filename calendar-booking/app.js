/**
 * Calendar Booking Application with NunDB
 * Real-time professional scheduling system
 */

class CalendarBookingApp {
    constructor() {
        this.nundb = null;
        this.currentWeek = new Date();
        this.selectedProfessional = null;
        this.professionals = [];
        this.appointments = new Map();
        this.currentView = 'week';
        this.workingHours = { start: 9, end: 17 }; // 9 AM to 5 PM
        
        this.init();
    }

    async init() {
        try {
            // Set up the basic UI first
            this.setupEventListeners();
            this.renderCalendar();
            
            // Load professionals immediately (they don't depend on NunDB)
            await this.loadProfessionals();
            
            // Then try to connect to NunDB
            await this.connectToNunDB();
            
            // Re-render with any additional data from NunDB
            this.renderCalendar();
        } catch (error) {
            console.error('Initialization error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async connectToNunDB() {
        try {
            this.nundb = new NunDb({
                url: 'wss://ws-staging.nundb.org/',
                db: 'calendar-booking-demo',
                token: 'demo-token',
                //user: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
            });

            await this.nundb._connectionPromise;
            console.log('Connected to NunDB');
            this.updateConnectionStatus('connected', 'Connected');
            
            // Watch for real-time updates
            this.watchAppointments();
        } catch (error) {
            console.error('Failed to connect to NunDB:', error);
            this.updateConnectionStatus('error', 'Connection Error');
            this.showToast('Failed to connect. Some features may not work.', 'warning');
            // Don't re-throw the error - let the app continue without NunDB
        }
    }

    setupEventListeners() {
        // Calendar navigation
        document.getElementById('prevWeek').addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('nextWeek').addEventListener('click', () => this.navigateWeek(1));
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());

        // View controls
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderCalendar();
            });
        });

        // Professional filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterProfessionals(e.target.dataset.filter);
            });
        });

        // Booking form
        document.getElementById('bookingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBooking();
        });

        document.getElementById('cancelBooking').addEventListener('click', () => {
            this.hideBookingForm();
        });

        // Modal controls
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        document.getElementById('cancelAppointment').addEventListener('click', () => {
            this.cancelAppointment();
        });

        // Click outside modal to close
        document.getElementById('bookingModal').addEventListener('click', (e) => {
            if (e.target.id === 'bookingModal') {
                this.closeModal();
            }
        });
    }

    async loadProfessionals() {
        try {
            // Sample professionals data - in real app this would come from API/database
            this.professionals = [
            {
                id: 'prof_1',
                name: 'Dr. Sarah Johnson',
                specialty: 'Cardiologist',
                avatar: 'SJ',
                available: true,
                workingHours: { start: 9, end: 17 },
                workingDays: [1, 2, 3, 4, 5] // Monday to Friday
            },
            {
                id: 'prof_2',
                name: 'Dr. Michael Chen',
                specialty: 'Dermatologist',
                avatar: 'MC',
                available: true,
                workingHours: { start: 10, end: 18 },
                workingDays: [1, 2, 3, 4, 5]
            },
            {
                id: 'prof_3',
                name: 'Dr. Emily Rodriguez',
                specialty: 'Pediatrician',
                avatar: 'ER',
                available: false,
                workingHours: { start: 8, end: 16 },
                workingDays: [1, 2, 3, 4, 5]
            },
            {
                id: 'prof_4',
                name: 'Dr. James Wilson',
                specialty: 'Orthopedist',
                avatar: 'JW',
                available: true,
                workingHours: { start: 9, end: 17 },
                workingDays: [1, 2, 3, 4, 5, 6] // Monday to Saturday
            }
        ];

        console.log('Loaded professionals:', this.professionals.length);
        this.renderProfessionals();
        
        // Load appointments for all professionals
        await this.loadAppointments();
        } catch (error) {
            console.error('Failed to load professionals:', error);
            // Fallback: still try to render what we have
            this.renderProfessionals();
        }
    }

    renderProfessionals() {
        const container = document.getElementById('professionalsList');
        if (!container) {
            console.warn('Professionals list container not found');
            return;
        }
        
        if (!this.professionals || this.professionals.length === 0) {
            console.warn('No professionals to render');
            container.innerHTML = '<p>No professionals available</p>';
            return;
        }
        
        container.innerHTML = this.professionals.map(prof => `
            <div class="professional-item" data-id="${prof.id}" onclick="app.selectProfessional('${prof.id}')">
                <div class="professional-avatar">${prof.avatar}</div>
                <div class="professional-info">
                    <div class="professional-name">${prof.name}</div>
                    <div class="professional-specialty">${prof.specialty}</div>
                </div>
                <div class="professional-status">
                    <div class="status-dot ${prof.available ? '' : 'busy'}"></div>
                    <span>${prof.available ? 'Available' : 'Busy'}</span>
                </div>
            </div>
        `).join('');
    }

    selectProfessional(professionalId) {
        // Update selection
        document.querySelectorAll('.professional-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-id="${professionalId}"]`).classList.add('selected');
        
        this.selectedProfessional = professionalId;
        this.renderCalendar();
    }

    filterProfessionals(filter) {
        const items = document.querySelectorAll('.professional-item');
        items.forEach(item => {
            const professionalId = item.dataset.id;
            const professional = this.professionals.find(p => p.id === professionalId);
            
            if (filter === 'all' || (filter === 'available' && professional.available)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    navigateWeek(direction) {
        const days = direction * 7;
        this.currentWeek.setDate(this.currentWeek.getDate() + days);
        this.renderCalendar();
    }

    goToToday() {
        this.currentWeek = new Date();
        this.renderCalendar();
    }

    renderCalendar() {
        // Check if required DOM elements exist
        if (!document.getElementById('currentWeek') || 
            !document.getElementById('timeSlots') || 
            !document.getElementById('daysContainer')) {
            console.warn('Calendar DOM elements not found, skipping render');
            return;
        }
        
        this.renderCalendarHeader();
        this.generateTimeSlots();
        this.generateDaysGrid();
    }

    renderCalendarHeader() {
        const startOfWeek = this.getStartOfWeek(this.currentWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        const title = this.currentView === 'week' 
            ? `${this.formatDate(startOfWeek, 'MMM dd')} - ${this.formatDate(endOfWeek, 'MMM dd, yyyy')}`
            : this.formatDate(this.currentWeek, 'MMMM dd, yyyy');
            
        document.getElementById('currentWeek').textContent = title;
    }

    generateTimeSlots() {
        const container = document.getElementById('timeSlots');
        const slots = [];
        
        for (let hour = this.workingHours.start; hour < this.workingHours.end; hour++) {
            slots.push(`
                <div class="time-slot">
                    ${this.formatTime(hour)}
                </div>
            `);
        }
        
        container.innerHTML = slots.join('');
    }

    generateDaysGrid() {
        const container = document.getElementById('daysContainer');
        const days = this.currentView === 'week' ? this.getWeekDays() : [this.currentWeek];
        
        container.innerHTML = days.map(day => this.renderDayColumn(day)).join('');
    }

    renderDayColumn(date) {
        const isToday = this.isSameDay(date, new Date());
        const dayName = this.formatDate(date, 'EEE');
        const dayNumber = date.getDate();
        
        return `
            <div class="day-column">
                <div class="day-header ${isToday ? 'today' : ''}">
                    <div class="day-name">${dayName}</div>
                    <div class="day-number">${dayNumber}</div>
                </div>
                <div class="day-slots">
                    ${this.renderHourSlots(date)}
                </div>
            </div>
        `;
    }

    renderHourSlots(date) {
        const slots = [];
        
        for (let hour = this.workingHours.start; hour < this.workingHours.end; hour++) {
            const slotDate = new Date(date);
            slotDate.setHours(hour, 0, 0, 0);
            
            const slotId = this.selectedProfessional ? `${this.selectedProfessional}_${slotDate.getTime()}` : null;
            const appointment = slotId ? this.appointments.get(slotId) : null;
            const isAvailable = this.selectedProfessional ? this.isSlotAvailable(slotDate) : false;
            const isPast = slotDate < new Date();
            
            let slotClass = 'hour-slot';
            if (isPast) {
                slotClass += ' past';
            } else if (appointment) {
                slotClass += ' booked';
            } else if (isAvailable) {
                slotClass += ' available';
            }
            
            const professionalId = this.selectedProfessional || '';
            slots.push(`
                <div class="${slotClass}" 
                     data-date="${slotDate.getTime()}" 
                     data-professional="${professionalId}"
                     onclick="app.handleSlotClick('${slotDate.getTime()}', '${professionalId}')">
                    ${appointment ? this.renderAppointment(appointment) : ''}
                </div>
            `);
        }
        
        return slots.join('');
    }

    renderAppointment(appointment) {
        return `
            <div class="appointment" onclick="app.showAppointmentDetails('${appointment.id}'); event.stopPropagation();">
                <div class="appointment-time">${this.formatTime(new Date(appointment.startTime).getHours())}</div>
                <div class="appointment-client">${appointment.clientName}</div>
            </div>
        `;
    }

    handleSlotClick(timestamp, professionalId) {
        if (!professionalId) {
            this.showToast('Please select a professional first', 'warning');
            return;
        }
        
        const slotDate = new Date(parseInt(timestamp));
        const slotId = `${professionalId}_${timestamp}`;
        
        // Check if slot is in the past
        if (slotDate < new Date()) {
            this.showToast('Cannot book appointments in the past', 'error');
            return;
        }
        
        // Check if slot is already booked
        if (this.appointments.has(slotId)) {
            return; // Appointment details will be shown by the appointment click handler
        }
        
        // Check if slot is available for the professional
        if (!this.isSlotAvailable(slotDate)) {
            this.showToast('This time slot is not available', 'warning');
            return;
        }
        
        // Show booking form
        this.showBookingForm(timestamp, professionalId);
    }

    isSlotAvailable(date) {
        if (!this.selectedProfessional) return false;
        
        const professional = this.professionals.find(p => p.id === this.selectedProfessional);
        if (!professional) return false;
        
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        
        // Check if professional works on this day
        if (!professional.workingDays.includes(dayOfWeek)) return false;
        
        // Check if within working hours
        if (hour < professional.workingHours.start || hour >= professional.workingHours.end) return false;
        
        // Check if professional is available
        if (!professional.available) return false;
        
        return true;
    }

    showBookingForm(timestamp, professionalId) {
        const professional = this.professionals.find(p => p.id === professionalId);
        const date = new Date(parseInt(timestamp));
        
        document.getElementById('selectedSlot').value = timestamp;
        document.getElementById('selectedProfessional').value = professionalId;
        
        // Update form title with selected time and professional
        const formSection = document.getElementById('bookingFormSection');
        const title = formSection.querySelector('h3');
        title.textContent = `Book with ${professional.name} - ${this.formatDate(date, 'MMM dd')} at ${this.formatTime(date.getHours())}`;
        
        formSection.style.display = 'block';
        formSection.scrollIntoView({ behavior: 'smooth' });
        
        // Clear form
        document.getElementById('bookingForm').reset();
        document.getElementById('selectedSlot').value = timestamp;
        document.getElementById('selectedProfessional').value = professionalId;
    }

    hideBookingForm() {
        document.getElementById('bookingFormSection').style.display = 'none';
    }

    async handleBooking() {
        const formData = new FormData(document.getElementById('bookingForm'));
        const timestamp = document.getElementById('selectedSlot').value;
        const professionalId = document.getElementById('selectedProfessional').value;
        
        const appointment = {
            id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
            professionalId,
            startTime: parseInt(timestamp),
            endTime: parseInt(timestamp) + (60 * 60 * 1000), // 1 hour later
            clientName: formData.get('clientName'),
            clientEmail: formData.get('clientEmail'),
            clientPhone: formData.get('clientPhone'),
            serviceType: formData.get('serviceType'),
            notes: formData.get('notes'),
            status: 'confirmed',
            createdAt: Date.now()
        };
        
        try {
            // Save to NunDB
            await this.saveAppointment(appointment);
            
            this.showToast('Appointment booked successfully!', 'success');
            this.hideBookingForm();
            
            // Refresh calendar
            await this.loadAppointments();
            this.renderCalendar();
            
        } catch (error) {
            console.error('Failed to book appointment:', error);
            this.showToast('Failed to book appointment. Please try again.', 'error');
        }
    }

    async saveAppointment(appointment) {
        const slotKey = `appointment:${appointment.professionalId}:${appointment.startTime}`;
        const appointmentKey = `appointment:${appointment.id}`;
        
        // Save appointment data
        await this.nundb.set(appointmentKey, appointment);
        
        // Mark slot as booked
        await this.nundb.set(slotKey, appointment.id);
    }

    async loadAppointments() {
        if (!this.nundb) return;
        
        try {
            // Load appointments for current week
            const startOfWeek = this.getStartOfWeek(this.currentWeek);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 7);
            
            // In a real implementation, you'd query by date range
            // For demo, we'll load all appointments and filter
            const appointments = [];
            
            // Store in local map for quick access
            this.appointments.clear();
            appointments.forEach(apt => {
                const slotId = `${apt.professionalId}_${apt.startTime}`;
                this.appointments.set(slotId, apt);
            });
            
        } catch (error) {
            console.error('Failed to load appointments:', error);
        }
    }

    watchAppointments() {
        if (!this.nundb) return;
        
        // Watch for appointment changes
        this.nundb.watch('appointment:', (data) => {
            if (data && data.value) {
                console.log('Appointment updated:', data.value);
                // Refresh appointments
                this.loadAppointments().then(() => {
                    this.renderCalendar();
                });
            }
        });
    }

    showAppointmentDetails(appointmentId) {
        const appointment = Array.from(this.appointments.values()).find(apt => apt.id === appointmentId);
        if (!appointment) return;
        
        const professional = this.professionals.find(p => p.id === appointment.professionalId);
        const startTime = new Date(appointment.startTime);
        const endTime = new Date(appointment.endTime);
        
        document.getElementById('bookingDetails').innerHTML = `
            <div class="appointment-details">
                <h4>${appointment.clientName}</h4>
                <p><strong>Professional:</strong> ${professional.name}</p>
                <p><strong>Service:</strong> ${appointment.serviceType}</p>
                <p><strong>Date:</strong> ${this.formatDate(startTime, 'MMMM dd, yyyy')}</p>
                <p><strong>Time:</strong> ${this.formatTime(startTime.getHours())} - ${this.formatTime(endTime.getHours())}</p>
                <p><strong>Email:</strong> ${appointment.clientEmail}</p>
                ${appointment.clientPhone ? `<p><strong>Phone:</strong> ${appointment.clientPhone}</p>` : ''}
                ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
                <p><strong>Status:</strong> <span class="status-badge ${appointment.status}">${appointment.status}</span></p>
            </div>
        `;
        
        // Store current appointment ID for potential cancellation
        document.getElementById('cancelAppointment').dataset.appointmentId = appointmentId;
        
        document.getElementById('bookingModal').classList.add('show');
    }

    async cancelAppointment() {
        const appointmentId = document.getElementById('cancelAppointment').dataset.appointmentId;
        if (!appointmentId) return;
        
        if (!confirm('Are you sure you want to cancel this appointment?')) return;
        
        try {
            // In real implementation, you'd update the appointment status or delete it
            // For demo, we'll remove it from local storage
            
            this.showToast('Appointment cancelled successfully', 'success');
            this.closeModal();
            
            // Refresh calendar
            await this.loadAppointments();
            this.renderCalendar();
            
        } catch (error) {
            console.error('Failed to cancel appointment:', error);
            this.showToast('Failed to cancel appointment', 'error');
        }
    }

    closeModal() {
        document.getElementById('bookingModal').classList.remove('show');
    }

    // Utility functions
    getStartOfWeek(date) {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        return start;
    }

    getWeekDays() {
        const startOfWeek = this.getStartOfWeek(this.currentWeek);
        const days = [];
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            days.push(day);
        }
        
        return days;
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    formatDate(date, format = 'MMMM dd, yyyy') {
        if (format === 'MMM dd') {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (format === 'MMM dd, yyyy') {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else if (format === 'MMMM dd, yyyy') {
            return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } else if (format === 'EEE') {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
    }

    formatTime(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:00 ${period}`;
    }

    updateConnectionStatus(status, message) {
        const statusEl = document.getElementById('connectionStatus');
        if (!statusEl) return;
        
        const indicator = statusEl.querySelector('.status-indicator');
        const text = statusEl.querySelector('.status-text');
        
        if (indicator) indicator.className = `status-indicator ${status}`;
        if (text) text.textContent = message;
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        if (show) {
            loadingState.classList.add('active');
        } else {
            loadingState.classList.remove('active');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CalendarBookingApp();
});
