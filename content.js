// PageMark Content Script
// Handles scroll position detection, saving, and restoration
// Enhanced with scrollbar markers for better visibility

class PageMark {
  constructor() {
    this.markers = [];
    this.currentMarker = null;
    this.isVisible = false;
    this.scrollContainer = null;
    this.scrollbarMarkers = [];
    this.init();
  }

  init() {
    // Load existing markers for this page
    this.loadMarkers();
    
    // Detect scroll container
    this.detectScrollContainer();
    
    // Create floating UI
    this.createFloatingUI();
    
    // Add keyboard shortcuts
    this.addKeyboardShortcuts();
    
    // Listen for scroll events
    this.addScrollListener();
    
    // Listen for messages from popup
    this.addMessageListener();
    
    // Create scrollbar markers
    this.createScrollbarMarkers();
  }

  detectScrollContainer() {
    // Try to find the main scrollable container
    const selectors = [
      // Common chat interfaces
      '[data-testid="scrollable-area"]', // ChatGPT
      '.conversation-container', // Gemini
      '.chat-container',
      '[role="main"]',
      
      // Generic scrollable containers
      '.scroll-container',
      '.content-area',
      '.main-content',
      '.scrollable',
      
      // Body as fallback
      'body'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const scrollable = this.findScrollableParent(element);
        if (scrollable && scrollable !== document.body) {
          this.scrollContainer = scrollable;
          console.log('PageMark: Using scroll container', this.scrollContainer);
          return;
        }
      }
    }

    // Default to window
    this.scrollContainer = window;
    console.log('PageMark: Using window as scroll container');
  }

  findScrollableParent(element) {
    let current = element;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const overflow = style.overflow + style.overflowY;
      
      if (overflow.includes('scroll') || overflow.includes('auto')) {
        return current;
      }
      current = current.parentElement;
    }
    return window;
  }

  createFloatingUI() {
    // Create floating marker button
    this.markerButton = document.createElement('div');
    this.markerButton.id = 'pagemark-marker-btn';
    this.markerButton.innerHTML = `
      <div class="pagemark-icon">📍</div>
      <div class="pagemark-tooltip">Save current position (Ctrl+Shift+M)</div>
    `;
    this.markerButton.addEventListener('click', () => this.saveCurrentPosition());
    document.body.appendChild(this.markerButton);

    // Create markers list panel
    this.markersPanel = document.createElement('div');
    this.markersPanel.id = 'pagemark-panel';
    this.markersPanel.innerHTML = `
      <div class="pagemark-header">
        <h3>📍 PageMark</h3>
        <button class="pagemark-close">×</button>
      </div>
      <div class="pagemark-content">
        <div class="pagemark-list"></div>
        <div class="pagemark-empty">No markers saved yet</div>
      </div>
    `;
    
    this.markersPanel.querySelector('.pagemark-close').addEventListener('click', () => {
      this.hidePanel();
    });
    
    document.body.appendChild(this.markersPanel);
  }

  createScrollbarMarkers() {
    // Remove existing scrollbar markers
    this.removeScrollbarMarkers();
    
    // Create scrollbar markers for each saved position
    this.markers.forEach(marker => {
      this.createScrollbarMarker(marker);
    });
  }

  createScrollbarMarker(marker) {
    const scrollbarMarker = document.createElement('div');
    scrollbarMarker.className = 'pagemark-scrollbar-marker';
    scrollbarMarker.setAttribute('data-marker-id', marker.id);
    scrollbarMarker.innerHTML = `
      <div class="pagemark-scrollbar-icon">📍</div>
      <div class="pagemark-scrollbar-tooltip">${marker.title}</div>
    `;
    
    // Position the marker on the scrollbar
    this.positionScrollbarMarker(scrollbarMarker, marker);
    
    // Add click event
    scrollbarMarker.addEventListener('click', (e) => {
      e.stopPropagation();
      this.scrollToPosition(marker);
    });
    
    // Add to the appropriate container
    if (this.scrollContainer === window) {
      document.body.appendChild(scrollbarMarker);
    } else {
      this.scrollContainer.appendChild(scrollbarMarker);
    }
    
    this.scrollbarMarkers.push(scrollbarMarker);
  }

  positionScrollbarMarker(markerElement, markerData) {
    const container = this.scrollContainer === window ? document.documentElement : this.scrollContainer;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const scrollTop = markerData.scrollY;
    
    // Calculate position as percentage of scroll
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
    
    // Position marker on the scrollbar (right side)
    markerElement.style.position = 'fixed';
    markerElement.style.right = '8px';
    markerElement.style.top = `${scrollPercentage * (clientHeight - 40)}px`; // 40px for marker height
    markerElement.style.zIndex = '10000';
  }

  removeScrollbarMarkers() {
    this.scrollbarMarkers.forEach(marker => {
      if (marker.parentNode) {
        marker.parentNode.removeChild(marker);
      }
    });
    this.scrollbarMarkers = [];
  }

  updateScrollbarMarkers() {
    this.scrollbarMarkers.forEach(marker => {
      const markerId = marker.getAttribute('data-marker-id');
      const markerData = this.markers.find(m => m.id === markerId);
      if (markerData) {
        this.positionScrollbarMarker(marker, markerData);
      }
    });
  }

  addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+M to save current position
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        this.saveCurrentPosition();
      }
      
      // Ctrl+Shift+L to show/hide markers panel
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.togglePanel();
      }
    });
  }

  addScrollListener() {
    let scrollTimeout;
    
    const handleScroll = () => {
      // Update scrollbar markers position
      this.updateScrollbarMarkers();
      
      // Clear existing timeout
      clearTimeout(scrollTimeout);
      
      // Set new timeout to save scroll position after scrolling stops
      scrollTimeout = setTimeout(() => {
        this.saveScrollPosition();
      }, 1000);
    };

    // Listen to the appropriate scroll container
    if (this.scrollContainer === window) {
      window.addEventListener('scroll', handleScroll);
    } else {
      this.scrollContainer.addEventListener('scroll', handleScroll);
    }
  }

  addMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'savePosition':
          this.saveCurrentPosition();
          sendResponse({ success: true });
          break;
        case 'getMarkers':
          sendResponse({ markers: this.markers });
          break;
        case 'scrollToMarker':
          const marker = this.markers.find(m => m.id === request.markerId);
          if (marker) {
            this.scrollToPosition(marker);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false });
          }
          break;
        case 'deleteMarker':
          this.deleteMarker(request.markerId);
          sendResponse({ success: true });
          break;
        case 'togglePanel':
          this.togglePanel();
          sendResponse({ success: true });
          break;
      }
    });
  }

  saveCurrentPosition() {
    const title = prompt('Enter a name for this position:');
    if (!title) return;

    // Get scroll position from the appropriate container
    const scrollY = this.scrollContainer === window ? 
      window.scrollY : 
      this.scrollContainer.scrollTop;
    
    const scrollX = this.scrollContainer === window ? 
      window.scrollX : 
      this.scrollContainer.scrollLeft;

    const marker = {
      id: Date.now().toString(),
      title: title,
      url: window.location.href,
      scrollY: scrollY,
      scrollX: scrollX,
      timestamp: new Date().toISOString(),
      pageTitle: document.title
    };

    this.markers.push(marker);
    this.saveMarkers();
    this.createScrollbarMarker(marker);
    this.updatePanel();
    this.showNotification(`Position "${title}" saved!`);
  }

  saveScrollPosition() {
    // Auto-save current scroll position for quick return
    const scrollY = this.scrollContainer === window ? 
      window.scrollY : 
      this.scrollContainer.scrollTop;
    
    const scrollX = this.scrollContainer === window ? 
      window.scrollX : 
      this.scrollContainer.scrollLeft;

    const autoMarker = {
      id: 'auto-save',
      title: 'Last Position',
      url: window.location.href,
      scrollY: scrollY,
      scrollX: scrollX,
      timestamp: new Date().toISOString(),
      pageTitle: document.title,
      isAuto: true
    };

    // Update or create auto-save marker
    const existingIndex = this.markers.findIndex(m => m.id === 'auto-save');
    if (existingIndex >= 0) {
      this.markers[existingIndex] = autoMarker;
    } else {
      this.markers.push(autoMarker);
    }
    
    this.saveMarkers();
  }

  scrollToPosition(marker) {
    const scrollOptions = {
      top: marker.scrollY,
      left: marker.scrollX,
      behavior: 'smooth'
    };

    if (this.scrollContainer === window) {
      window.scrollTo(scrollOptions);
    } else {
      this.scrollContainer.scrollTo(scrollOptions);
    }
    
    this.showNotification(`Scrolled to "${marker.title}"`);
  }

  deleteMarker(markerId) {
    this.markers = this.markers.filter(m => m.id !== markerId);
    this.saveMarkers();
    
    // Remove scrollbar marker
    const scrollbarMarker = document.querySelector(`[data-marker-id="${markerId}"]`);
    if (scrollbarMarker) {
      scrollbarMarker.remove();
    }
    
    this.updatePanel();
  }

  togglePanel() {
    if (this.isVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  showPanel() {
    this.markersPanel.style.display = 'block';
    this.isVisible = true;
    this.updatePanel();
  }

  hidePanel() {
    this.markersPanel.style.display = 'none';
    this.isVisible = false;
  }

  updatePanel() {
    const list = this.markersPanel.querySelector('.pagemark-list');
    const empty = this.markersPanel.querySelector('.pagemark-empty');
    
    if (this.markers.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'block';
    } else {
      list.style.display = 'block';
      empty.style.display = 'none';
      
      list.innerHTML = this.markers.map(marker => `
        <div class="pagemark-item" data-marker-id="${marker.id}">
          <div class="pagemark-item-content">
            <div class="pagemark-item-title">${marker.title}</div>
            <div class="pagemark-item-time">${this.formatTime(marker.timestamp)}</div>
          </div>
          <div class="pagemark-item-actions">
            <button class="pagemark-go-btn" onclick="window.pageMark.scrollToPosition(${JSON.stringify(marker)})">Go</button>
            <button class="pagemark-delete-btn" onclick="window.pageMark.deleteMarker('${marker.id}')">×</button>
          </div>
        </div>
      `).join('');
    }
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'pagemark-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  loadMarkers() {
    const url = window.location.href;
    chrome.storage.local.get(['pagemark_markers'], (result) => {
      const allMarkers = result.pagemark_markers || {};
      this.markers = allMarkers[url] || [];
    });
  }

  saveMarkers() {
    const url = window.location.href;
    chrome.storage.local.get(['pagemark_markers'], (result) => {
      const allMarkers = result.pagemark_markers || {};
      allMarkers[url] = this.markers;
      chrome.storage.local.set({ pagemark_markers: allMarkers });
    });
  }
}

// Initialize PageMark when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pageMark = new PageMark();
  });
} else {
  window.pageMark = new PageMark();
} 