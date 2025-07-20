class TimeTracker {
    constructor() {
        this.db = null;
        this.tasks = new Map();
        this.runningTimers = new Map();
        this.userId = this.generateUserId();
        this.workspace = null;
        this.tasksKey = null;
        
        this.init();
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    async init() {
        this.workspace = this.getWorkspaceFromUrl();
        
        if (this.workspace) {
            this.showAppScreen();
            await this.initializeApp();
        } else {
            this.showSetupScreen();
        }
    }

    getWorkspaceFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const workspace = urlParams.get('workspace');
        return workspace && this.isValidWorkspaceName(workspace) ? workspace : null;
    }

    isValidWorkspaceName(name) {
        return /^[a-zA-Z0-9-_]+$/.test(name) && name.length >= 1 && name.length <= 50;
    }

    showSetupScreen() {
        document.getElementById('setupScreen').style.display = 'block';
        document.getElementById('appScreen').style.display = 'none';
        this.setupWorkspaceEventListeners();
    }

    showAppScreen() {
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'block';
        
        this.tasksKey = `tasks_${this.workspace}`;
        document.getElementById('workspaceInfo').textContent = `Workspace: "${this.workspace}" - Collaborate in real-time!`;
        document.title = `Time Tracker - ${this.workspace}`;
    }

    setupWorkspaceEventListeners() {
        const workspaceInput = document.getElementById('workspaceInput');
        const joinBtn = document.getElementById('joinWorkspaceBtn');

        workspaceInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            joinBtn.disabled = !this.isValidWorkspaceName(value);
        });

        workspaceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !joinBtn.disabled) {
                this.joinWorkspace();
            }
        });

        joinBtn.addEventListener('click', () => this.joinWorkspace());
    }

    joinWorkspace() {
        const workspaceInput = document.getElementById('workspaceInput');
        const workspace = workspaceInput.value.trim();
        
        if (this.isValidWorkspaceName(workspace)) {
            this.workspace = workspace;
            this.updateUrlWithWorkspace(workspace);
            this.showAppScreen();
            this.initializeApp();
        }
    }

    updateUrlWithWorkspace(workspace) {
        const url = new URL(window.location);
        url.searchParams.set('workspace', workspace);
        window.history.pushState({}, '', url);
    }

    async initializeApp() {
        try {
            await this.connectToDatabase();
            this.setupEventListeners();
            await this.loadTasks();
            this.startPeriodicUpdates();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.updateConnectionStatus('disconnected', 'Connection Failed');
        }
    }

    async connectToDatabase() {
        this.updateConnectionStatus('connecting', 'Connecting...');
        
        this.db = new NunDb({
            url: 'wss://ws-staging.nundb.org/',
            db: 'time-tracker-demo',
            token: 'demo-token'
        });

        this.db._logger = console;

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 10000);

            this.db._connectionPromise.then(() => {
                clearTimeout(timeout);
                this.updateConnectionStatus('connected', 'Connected');
                resolve();
            }).catch(reject);
        });

        this.setupTaskWatcher();
    }

    updateConnectionStatus(status, message) {
        const statusEl = document.getElementById('connectionStatus');
        statusEl.className = `connection-status ${status}`;
        statusEl.innerHTML = status === 'connecting' 
            ? '<span class="loading"></span> ' + message
            : message;
    }

    setupEventListeners() {
        const taskInput = document.getElementById('taskTitleInput');
        const startBtn = document.getElementById('startTaskBtn');
        const changeWorkspaceBtn = document.getElementById('changeWorkspaceBtn');

        startBtn.addEventListener('click', () => this.startNewTask());
        
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.startNewTask();
            }
        });

        taskInput.addEventListener('input', (e) => {
            startBtn.disabled = !e.target.value.trim();
        });

        changeWorkspaceBtn.addEventListener('click', () => this.changeWorkspace());
    }

    changeWorkspace() {
        if (confirm('Are you sure you want to leave this workspace? Any running timers will be stopped.')) {
            // Stop all running timers
            this.runningTimers.forEach((timer, taskId) => {
                clearInterval(timer);
            });
            this.runningTimers.clear();
            
            // Clear URL and reload
            const url = new URL(window.location);
            url.searchParams.delete('workspace');
            window.history.pushState({}, '', url);
            
            // Reset state and show setup screen
            this.workspace = null;
            this.tasksKey = null;
            this.tasks.clear();
            
            this.showSetupScreen();
        }
    }

    async setupTaskWatcher() {
        try {
            await this.db.watch(this.tasksKey, (data) => {
                console.log('Task update received:', data);
                this.handleTaskUpdate(data);
            }, true);
        } catch (error) {
            console.error('Failed to setup task watcher:', error);
        }
    }

    handleTaskUpdate(data) {
        if (data.value) {
            try {
                const tasks = typeof data.value === 'string' 
                    ? JSON.parse(data.value) 
                    : data.value;
                
                if (Array.isArray(tasks)) {
                    this.tasks.clear();
                    tasks.forEach(task => {
                        this.tasks.set(task.id, task);
                        if (task.status === 'running') {
                            this.startTimer(task.id);
                        }
                    });
                    this.renderTasks();
                }
            } catch (error) {
                console.error('Failed to parse task update:', error);
            }
        }
    }

    async loadTasks() {
        try {
            const result = await this.db.get(this.tasksKey);
            if (result && result.value) {
                const tasks = typeof result.value === 'string' 
                    ? JSON.parse(result.value) 
                    : result.value;
                
                if (Array.isArray(tasks)) {
                    tasks.forEach(task => {
                        this.tasks.set(task.id, task);
                        if (task.status === 'running') {
                            this.startTimer(task.id);
                        }
                    });
                }
            }
            this.renderTasks();
        } catch (error) {
            console.error('Failed to load tasks:', error);
            this.renderTasks();
        }
    }

    async startNewTask() {
        const titleInput = document.getElementById('taskTitleInput');
        const title = titleInput.value.trim();
        
        if (!title) return;

        const task = {
            id: this.generateTaskId(),
            title: title,
            status: 'running',
            startTime: Date.now(),
            endTime: null,
            totalTime: 0,
            createdBy: this.userId,
            createdAt: Date.now()
        };

        this.tasks.set(task.id, task);
        this.startTimer(task.id);
        
        titleInput.value = '';
        document.getElementById('startTaskBtn').disabled = true;

        await this.saveTasks();
        this.renderTasks();
    }

    generateTaskId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }

    async stopTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task && task.status === 'running') {
            task.status = 'stopped';
            task.endTime = Date.now();
            task.totalTime += task.endTime - task.startTime;
            
            this.stopTimer(taskId);
            await this.saveTasks();
            this.renderTasks();
        }
    }

    async resumeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task && task.status === 'stopped') {
            task.status = 'running';
            task.startTime = Date.now();
            task.endTime = null;
            
            this.startTimer(taskId);
            await this.saveTasks();
            this.renderTasks();
        }
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks.delete(taskId);
            this.stopTimer(taskId);
            await this.saveTasks();
            this.renderTasks();
        }
    }

    startTimer(taskId) {
        if (this.runningTimers.has(taskId)) {
            clearInterval(this.runningTimers.get(taskId));
        }

        const timer = setInterval(() => {
            this.updateTaskDisplay(taskId);
        }, 1000);

        this.runningTimers.set(taskId, timer);
    }

    stopTimer(taskId) {
        if (this.runningTimers.has(taskId)) {
            clearInterval(this.runningTimers.get(taskId));
            this.runningTimers.delete(taskId);
        }
    }

    updateTaskDisplay(taskId) {
        const timeEl = document.getElementById(`time-${taskId}`);
        if (timeEl) {
            const task = this.tasks.get(taskId);
            if (task && task.status === 'running') {
                const currentTime = task.totalTime + (Date.now() - task.startTime);
                timeEl.textContent = this.formatTime(currentTime);
            }
        }
    }

    startPeriodicUpdates() {
        setInterval(() => {
            this.runningTimers.forEach((timer, taskId) => {
                this.updateTaskDisplay(taskId);
            });
        }, 1000);
    }

    async saveTasks() {
        try {
            const tasksArray = Array.from(this.tasks.values());
            await this.db.set(this.tasksKey, tasksArray);
        } catch (error) {
            console.error('Failed to save tasks:', error);
        }
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');
        const tasks = Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);

        if (tasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <h4>No tasks yet</h4>
                    <p>Start your first task above to begin tracking time</p>
                </div>
            `;
            return;
        }

        taskList.innerHTML = tasks.map(task => this.renderTask(task)).join('');
    }

    renderTask(task) {
        const isRunning = task.status === 'running';
        const currentTime = isRunning 
            ? task.totalTime + (Date.now() - task.startTime)
            : task.totalTime;

        const createdDate = new Date(task.createdAt).toLocaleDateString();
        const isOwnTask = task.createdBy === this.userId;

        return `
            <div class="task-item ${isRunning ? 'running' : ''}">
                <div class="task-header">
                    <div class="task-title">
                        <span class="status-indicator ${isRunning ? 'status-running' : 'status-stopped'}"></span>
                        ${this.escapeHtml(task.title)}
                    </div>
                    <div class="task-time ${isRunning ? 'running' : ''}" id="time-${task.id}">
                        ${this.formatTime(currentTime)}
                    </div>
                </div>
                <div class="task-meta">
                    <span>Created: ${createdDate} ${isOwnTask ? '(You)' : '(Collaborator)'}</span>
                    <span>Status: ${isRunning ? '🟢 Running' : '⏸️ Stopped'}</span>
                </div>
                <div class="task-actions">
                    ${isRunning 
                        ? `<button class="btn btn-warning" onclick="timeTracker.stopTask('${task.id}')">⏸️ Stop</button>`
                        : `<button class="btn btn-success" onclick="timeTracker.resumeTask('${task.id}')">▶️ Resume</button>`
                    }
                    <button class="btn btn-danger" onclick="timeTracker.deleteTask('${task.id}')">🗑️ Delete</button>
                </div>
            </div>
        `;
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const remainingMinutes = minutes % 60;
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
        } else if (minutes > 0) {
            return `${remainingMinutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

let timeTracker;

document.addEventListener('DOMContentLoaded', () => {
    timeTracker = new TimeTracker();
});

window.timeTracker = timeTracker;