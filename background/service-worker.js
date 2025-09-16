class TabTimerManager {
  constructor() {
    this.timers = new Map();
    this.init();
  }

  async init() {
    await this.loadTimers();
    this.setupEventListeners();
    await this.restoreAlarms();
  }

  async loadTimers() {
    const result = await chrome.storage.local.get(['timers']);
    if (result.timers) {
      this.timers = new Map(Object.entries(result.timers));
    }
  }

  async saveTimers() {
    const timersObj = Object.fromEntries(this.timers);
    await chrome.storage.local.set({ timers: timersObj });
  }

  setupEventListeners() {
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.removeTimer(tabId.toString());
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url) {
        this.updateTimerUrl(tabId.toString(), changeInfo.url);
      }
    });
  }

  async restoreAlarms() {
    const alarms = await chrome.alarms.getAll();
    const validTimerIds = new Set();

    for (const [timerId, timer] of this.timers) {
      if (timer.endTime > Date.now()) {
        validTimerIds.add(timerId);
        
        const alarmExists = alarms.some(alarm => alarm.name === `timer_${timerId}`);
        if (!alarmExists) {
          await this.createAlarm(timerId, timer.endTime);
        }
      }
    }

    for (const [timerId] of this.timers) {
      if (!validTimerIds.has(timerId)) {
        this.timers.delete(timerId);
      }
    }

    await this.saveTimers();
  }

  async createTimer(tabId, endTime, type = 'countdown', label = '') {
    const timerId = `${tabId}_${Date.now()}`;
    const timer = {
      id: timerId,
      tabId: parseInt(tabId),
      endTime,
      type,
      label,
      created: Date.now()
    };

    try {
      const tab = await chrome.tabs.get(parseInt(tabId));
      timer.url = tab.url;
      timer.title = tab.title;
    } catch (error) {
      console.error('Error getting tab info:', error);
      return null;
    }

    this.timers.set(timerId, timer);
    await this.saveTimers();
    await this.createAlarm(timerId, endTime);

    return timer;
  }

  async createAlarm(timerId, endTime) {
    const alarmName = `timer_${timerId}`;
    await chrome.alarms.create(alarmName, { when: endTime });
  }

  async removeTimer(timerId) {
    if (this.timers.has(timerId)) {
      this.timers.delete(timerId);
      await this.saveTimers();
      await chrome.alarms.clear(`timer_${timerId}`);
      return true;
    }
    return false;
  }

  async updateTimer(timerId, newEndTime, newLabel) {
    if (this.timers.has(timerId)) {
      const timer = this.timers.get(timerId);
      timer.endTime = newEndTime;
      if (newLabel !== undefined) timer.label = newLabel;
      
      this.timers.set(timerId, timer);
      await this.saveTimers();
      
      await chrome.alarms.clear(`timer_${timerId}`);
      await this.createAlarm(timerId, newEndTime);
      
      return timer;
    }
    return null;
  }

  async updateTimerUrl(tabId, newUrl) {
    for (const [timerId, timer] of this.timers) {
      if (timer.tabId === parseInt(tabId)) {
        timer.url = newUrl;
        this.timers.set(timerId, timer);
      }
    }
    await this.saveTimers();
  }

  async handleAlarm(alarm) {
    if (!alarm.name.startsWith('timer_')) return;

    const timerId = alarm.name.replace('timer_', '');
    const timer = this.timers.get(timerId);

    if (!timer) return;

    try {
      await chrome.tabs.remove(timer.tabId);
      console.log(`Closed tab ${timer.tabId} for timer ${timerId}`);
    } catch (error) {
      console.error(`Error closing tab ${timer.tabId}:`, error);
    }

    this.timers.delete(timerId);
    await this.saveTimers();
  }

  getTimers() {
    return Array.from(this.timers.values());
  }

  getTimersByTab(tabId) {
    return this.getTimers().filter(timer => timer.tabId === parseInt(tabId));
  }

  async getActiveTimersCount() {
    const now = Date.now();
    const activeTimers = this.getTimers().filter(timer => timer.endTime > now);
    return activeTimers.length;
  }
}

const timerManager = new TabTimerManager();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'createTimer':
          const timer = await timerManager.createTimer(
            request.tabId,
            request.endTime,
            request.type,
            request.label
          );
          sendResponse({ success: true, timer });
          break;

        case 'removeTimer':
          const removed = await timerManager.removeTimer(request.timerId);
          sendResponse({ success: removed });
          break;

        case 'updateTimer':
          const updated = await timerManager.updateTimer(
            request.timerId,
            request.endTime,
            request.label
          );
          sendResponse({ success: !!updated, timer: updated });
          break;

        case 'getTimers':
          const timers = timerManager.getTimers();
          sendResponse({ success: true, timers });
          break;

        case 'getTimersByTab':
          const tabTimers = timerManager.getTimersByTab(request.tabId);
          sendResponse({ success: true, timers: tabTimers });
          break;

        case 'getActiveTimersCount':
          const count = await timerManager.getActiveTimersCount();
          sendResponse({ success: true, count });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
});