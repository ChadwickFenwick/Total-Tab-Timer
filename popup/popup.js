class TabTimerPopup {
  constructor() {
    this.currentTab = null;
    this.timers = [];
    this.editingTimer = null;
    this.countdownIntervals = new Map();
    this.init();
  }

  async init() {
    await this.getCurrentTab();
    this.setupEventListeners();
    this.setupFormToggle();
    await this.loadTimers();
    this.updateActiveTimersCount();
    this.startCountdownUpdates();
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
    this.updateCurrentTabInfo();
  }

  updateCurrentTabInfo() {
    if (!this.currentTab) return;

    const titleElement = document.getElementById('currentTabTitle');
    const urlElement = document.getElementById('currentTabUrl');

    titleElement.textContent = this.currentTab.title || 'Untitled';
    urlElement.textContent = this.currentTab.url || '';
  }

  setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    document.getElementById('timerType').addEventListener('change', () => {
      this.toggleTimerTypeInputs();
    });

    document.getElementById('editTimerType').addEventListener('change', () => {
      this.toggleEditTimerTypeInputs();
    });

    document.getElementById('createTimer').addEventListener('click', () => {
      this.createTimer();
    });

    document.getElementById('clearAllTimers').addEventListener('click', () => {
      this.clearAllTimers();
    });

    document.getElementById('closeModal').addEventListener('click', () => {
      this.closeEditModal();
    });

    document.getElementById('cancelEdit').addEventListener('click', () => {
      this.closeEditModal();
    });

    document.getElementById('saveEdit').addEventListener('click', () => {
      this.saveEditedTimer();
    });

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeEditModal();
      }
    });
  }

  setupFormToggle() {
    this.toggleTimerTypeInputs();
    this.setDefaultScheduledTime();
  }

  toggleTimerTypeInputs() {
    const timerType = document.getElementById('timerType').value;
    const countdownGroup = document.getElementById('countdownGroup');
    const scheduledGroup = document.getElementById('scheduledGroup');

    if (timerType === 'countdown') {
      countdownGroup.classList.remove('hidden');
      scheduledGroup.classList.add('hidden');
    } else {
      countdownGroup.classList.add('hidden');
      scheduledGroup.classList.remove('hidden');
      this.setDefaultScheduledTime();
    }
  }

  toggleEditTimerTypeInputs() {
    const timerType = document.getElementById('editTimerType').value;
    const countdownGroup = document.getElementById('editCountdownGroup');
    const scheduledGroup = document.getElementById('editScheduledGroup');

    if (timerType === 'countdown') {
      countdownGroup.classList.remove('hidden');
      scheduledGroup.classList.add('hidden');
    } else {
      countdownGroup.classList.add('hidden');
      scheduledGroup.classList.remove('hidden');
    }
  }

  setDefaultScheduledTime() {
    const scheduledInput = document.getElementById('scheduledTime');
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    scheduledInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName === 'current' ? 'currentTab' : 'allTab').classList.remove('hidden');

    if (tabName === 'all') {
      this.displayAllTimers();
    } else {
      this.displayCurrentTabTimers();
    }
  }

  async createTimer() {
    if (!this.currentTab) return;

    const timerType = document.getElementById('timerType').value;
    const label = document.getElementById('timerLabel').value.trim();
    let endTime;

    if (timerType === 'countdown') {
      const hours = parseInt(document.getElementById('hours').value) || 0;
      const minutes = parseInt(document.getElementById('minutes').value) || 0;
      const seconds = parseInt(document.getElementById('seconds').value) || 0;

      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      if (totalSeconds < 30) {
        this.showError('Timer must be at least 30 seconds');
        return;
      }

      endTime = Date.now() + totalSeconds * 1000;
    } else {
      const scheduledTime = document.getElementById('scheduledTime').value;
      if (!scheduledTime) {
        this.showError('Please select a time');
        return;
      }

      endTime = new Date(scheduledTime).getTime();
      if (endTime <= Date.now()) {
        this.showError('Scheduled time must be in the future');
        return;
      }

      if (endTime - Date.now() < 30000) {
        this.showError('Timer must be at least 30 seconds in the future');
        return;
      }
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'createTimer',
        tabId: this.currentTab.id,
        endTime,
        type: timerType,
        label: label || `${timerType} timer`
      });

      if (response.success) {
        this.clearForm();
        await this.loadTimers();
        this.showSuccess('Timer created successfully');
      } else {
        this.showError(response.error || 'Failed to create timer');
      }
    } catch (error) {
      this.showError('Failed to create timer');
      console.error('Error creating timer:', error);
    }
  }

  async loadTimers() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getTimers' });
      if (response.success) {
        this.timers = response.timers;
        this.displayCurrentTabTimers();
        this.updateActiveTimersCount();
      }
    } catch (error) {
      console.error('Error loading timers:', error);
    }
  }

  displayCurrentTabTimers() {
    const container = document.getElementById('currentTimerList');
    const timers = this.timers.filter(timer => 
      timer.tabId === this.currentTab?.id && timer.endTime > Date.now()
    );

    if (timers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          <p>No timers set for this tab</p>
        </div>
      `;
      return;
    }

    container.innerHTML = timers.map(timer => this.createTimerItemHTML(timer)).join('');
    this.attachTimerEventListeners();
  }

  displayAllTimers() {
    const container = document.getElementById('allTimerList');
    const activeTimers = this.timers.filter(timer => timer.endTime > Date.now());

    if (activeTimers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          <p>No active timers</p>
        </div>
      `;
      return;
    }

    container.innerHTML = activeTimers.map(timer => this.createTimerItemHTML(timer, true)).join('');
    this.attachTimerEventListeners();
  }

  createTimerItemHTML(timer, showTabInfo = false) {
    const timeLeft = this.getTimeLeft(timer.endTime);
    const countdownClass = this.getCountdownClass(timer.endTime);
    
    return `
      <div class="timer-item" data-timer-id="${timer.id}">
        <div class="timer-info">
          <div class="timer-label">${timer.label || 'Unnamed Timer'}</div>
          <div class="timer-meta">
            <span class="timer-countdown ${countdownClass}" data-end-time="${timer.endTime}">
              ${timeLeft}
            </span>
            <span>•</span>
            <span>${timer.type === 'countdown' ? 'Countdown' : 'Scheduled'}</span>
            ${showTabInfo ? `
              <span>•</span>
              <span class="tab-info" title="${timer.title || 'Untitled'}">${timer.title || 'Untitled'}</span>
            ` : ''}
          </div>
        </div>
        <div class="timer-actions">
          <button class="btn btn-secondary edit-timer" data-timer-id="${timer.id}" title="Edit">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn btn-danger remove-timer" data-timer-id="${timer.id}" title="Remove">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  attachTimerEventListeners() {
    document.querySelectorAll('.edit-timer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const timerId = e.currentTarget.dataset.timerId;
        this.editTimer(timerId);
      });
    });

    document.querySelectorAll('.remove-timer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const timerId = e.currentTarget.dataset.timerId;
        this.removeTimer(timerId);
      });
    });
  }

  async editTimer(timerId) {
    const timer = this.timers.find(t => t.id === timerId);
    if (!timer) return;

    this.editingTimer = timer;
    
    document.getElementById('editTimerType').value = timer.type;
    document.getElementById('editTimerLabel').value = timer.label || '';

    if (timer.type === 'countdown') {
      const timeLeft = timer.endTime - Date.now();
      const hours = Math.floor(timeLeft / 3600000);
      const minutes = Math.floor((timeLeft % 3600000) / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);

      document.getElementById('editHours').value = hours;
      document.getElementById('editMinutes').value = minutes;
      document.getElementById('editSeconds').value = seconds;
    } else {
      const date = new Date(timer.endTime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      document.getElementById('editScheduledTime').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    this.toggleEditTimerTypeInputs();
    document.getElementById('editModal').classList.remove('hidden');
  }

  async saveEditedTimer() {
    if (!this.editingTimer) return;

    const timerType = document.getElementById('editTimerType').value;
    const label = document.getElementById('editTimerLabel').value.trim();
    let newEndTime;

    if (timerType === 'countdown') {
      const hours = parseInt(document.getElementById('editHours').value) || 0;
      const minutes = parseInt(document.getElementById('editMinutes').value) || 0;
      const seconds = parseInt(document.getElementById('editSeconds').value) || 0;

      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      if (totalSeconds < 30) {
        this.showError('Timer must be at least 30 seconds');
        return;
      }

      newEndTime = Date.now() + totalSeconds * 1000;
    } else {
      const scheduledTime = document.getElementById('editScheduledTime').value;
      if (!scheduledTime) {
        this.showError('Please select a time');
        return;
      }

      newEndTime = new Date(scheduledTime).getTime();
      if (newEndTime <= Date.now()) {
        this.showError('Scheduled time must be in the future');
        return;
      }

      if (newEndTime - Date.now() < 30000) {
        this.showError('Timer must be at least 30 seconds in the future');
        return;
      }
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateTimer',
        timerId: this.editingTimer.id,
        endTime: newEndTime,
        label: label || `${timerType} timer`
      });

      if (response.success) {
        this.closeEditModal();
        await this.loadTimers();
        this.showSuccess('Timer updated successfully');
      } else {
        this.showError(response.error || 'Failed to update timer');
      }
    } catch (error) {
      this.showError('Failed to update timer');
      console.error('Error updating timer:', error);
    }
  }

  closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    this.editingTimer = null;
  }

  async removeTimer(timerId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'removeTimer',
        timerId
      });

      if (response.success) {
        await this.loadTimers();
        this.showSuccess('Timer removed');
      } else {
        this.showError('Failed to remove timer');
      }
    } catch (error) {
      this.showError('Failed to remove timer');
      console.error('Error removing timer:', error);
    }
  }

  async clearAllTimers() {
    if (!confirm('Are you sure you want to remove all timers?')) return;

    try {
      const removePromises = this.timers.map(timer =>
        chrome.runtime.sendMessage({
          action: 'removeTimer',
          timerId: timer.id
        })
      );

      await Promise.all(removePromises);
      await this.loadTimers();
      this.showSuccess('All timers cleared');
    } catch (error) {
      this.showError('Failed to clear timers');
      console.error('Error clearing timers:', error);
    }
  }

  clearForm() {
    document.getElementById('hours').value = 0;
    document.getElementById('minutes').value = 5;
    document.getElementById('seconds').value = 0;
    document.getElementById('timerLabel').value = '';
    document.getElementById('timerType').value = 'countdown';
    this.toggleTimerTypeInputs();
  }

  updateActiveTimersCount() {
    const activeCount = this.timers.filter(timer => timer.endTime > Date.now()).length;
    document.getElementById('activeTimersCount').textContent = activeCount;
  }

  getTimeLeft(endTime) {
    const timeLeft = endTime - Date.now();
    if (timeLeft <= 0) return 'Expired';

    const hours = Math.floor(timeLeft / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getCountdownClass(endTime) {
    const timeLeft = endTime - Date.now();
    if (timeLeft <= 60000) return 'danger';
    if (timeLeft <= 300000) return 'warning';
    return '';
  }

  startCountdownUpdates() {
    setInterval(() => {
      document.querySelectorAll('.timer-countdown').forEach(element => {
        const endTime = parseInt(element.dataset.endTime);
        const timeLeft = this.getTimeLeft(endTime);
        const countdownClass = this.getCountdownClass(endTime);
        
        element.textContent = timeLeft;
        element.className = `timer-countdown ${countdownClass}`;
        
        if (endTime <= Date.now()) {
          this.loadTimers();
        }
      });
    }, 1000);
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      padding: '0.75rem 1rem',
      borderRadius: '0.375rem',
      color: 'white',
      fontSize: '0.875rem',
      fontWeight: '500',
      zIndex: '9999',
      animation: 'slideIn 0.3s ease-out',
      background: type === 'success' ? '#10b981' : '#ef4444'
    });

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TabTimerPopup();
});

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);