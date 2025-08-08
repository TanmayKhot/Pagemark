// PageMark Popup Script
// Handles popup interactions and communicates with content script
// Enhanced for chat interfaces like ChatGPT and Gemini

class PageMarkPopup {
  constructor() {
    this.init();
  }

  init() {
    this.loadStats();
    this.loadRecentMarkers();
    this.addEventListeners();
    this.checkChatInterface();
  }

  addEventListeners() {
    // Save position button
    document.getElementById('save-position').addEventListener('click', () => {
      this.saveCurrentPosition();
    });

    // Show markers button
    document.getElementById('show-markers').addEventListener('click', () => {
      this.showMarkers();
    });
  }

  async checkChatInterface() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if current page is a chat interface
      const isChatInterface = tab.url.includes('chat.openai.com') || 
                             tab.url.includes('gemini.google.com') ||
                             tab.url.includes('claude.ai') ||
                             tab.url.includes('bard.google.com');
      
      if (isChatInterface) {
        this.updateUIForChat();
      }
    } catch (error) {
      console.error('Error checking chat interface:', error);
    }
  }

  updateUIForChat() {
    // Update popup title and description for chat interfaces
    const header = document.querySelector('.popup-header h1');
    const description = document.querySelector('.popup-header p');
    
    if (header) header.textContent = '📍 PageMark (Chat Mode)';
    if (description) description.textContent = 'Save positions in chat conversations';
    
    // Add chat-specific tips
    const tips = document.createElement('div');
    tips.className = 'chat-tips';
    tips.innerHTML = `
      <div class="tip">
        <strong>💡 Chat Tips:</strong>
        <ul>
          <li>Save important responses or code snippets</li>
          <li>Mark the start of new conversation topics</li>
          <li>Remember where you left off in long conversations</li>
        </ul>
      </div>
    `;
    
    const container = document.querySelector('.popup-container');
    if (container) {
      container.insertBefore(tips, container.querySelector('.popup-actions'));
    }
  }

  async saveCurrentPosition() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'savePosition' });
      
      if (response && response.success) {
        this.showNotification('Position saved successfully!');
        this.loadStats();
        this.loadRecentMarkers();
      }
    } catch (error) {
      console.error('Error saving position:', error);
      this.showNotification('Error saving position. Please refresh the page and try again.');
    }
  }

  async showMarkers() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script to show markers panel
      await chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
      
      // Close popup
      window.close();
    } catch (error) {
      console.error('Error showing markers:', error);
      this.showNotification('Error showing markers. Please refresh the page and try again.');
    }
  }

  async loadStats() {
    try {
      const result = await chrome.storage.local.get(['pagemark_markers']);
      const allMarkers = result.pagemark_markers || {};
      
      // Count total markers
      let totalMarkers = 0;
      let totalPages = 0;
      let chatMarkers = 0;
      
      Object.entries(allMarkers).forEach(([url, markers]) => {
        totalMarkers += markers.length;
        if (markers.length > 0) totalPages++;
        
        // Count chat interface markers
        markers.forEach(marker => {
          if (marker.isChatInterface) chatMarkers++;
        });
      });
      
      // Update UI
      document.getElementById('markers-count').textContent = totalMarkers;
      document.getElementById('pages-count').textContent = totalPages;
      
      // Add chat markers count if available
      const chatCountElement = document.getElementById('chat-markers-count');
      if (chatCountElement) {
        chatCountElement.textContent = chatMarkers;
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async loadRecentMarkers() {
    try {
      const result = await chrome.storage.local.get(['pagemark_markers']);
      const allMarkers = result.pagemark_markers || {};
      
      // Get all markers from all pages
      let allMarkersList = [];
      Object.entries(allMarkers).forEach(([url, markers]) => {
        markers.forEach(marker => {
          allMarkersList.push({
            ...marker,
            url: url
          });
        });
      });
      
      // Sort by timestamp (most recent first)
      allMarkersList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Get recent markers (limit to 5)
      const recentMarkers = allMarkersList.slice(0, 5);
      
      this.updateRecentMarkersList(recentMarkers);
    } catch (error) {
      console.error('Error loading recent markers:', error);
    }
  }

  updateRecentMarkersList(markers) {
    const container = document.getElementById('recent-markers');
    
    if (markers.length === 0) {
      container.innerHTML = '<div class="empty-state">No markers yet</div>';
      return;
    }
    
    container.innerHTML = markers.map(marker => `
      <div class="recent-item" data-marker-id="${marker.id}">
        <div class="recent-item-content">
          <div class="recent-item-title">
            ${marker.title}
            ${marker.isChatInterface ? '<span class="chat-badge">💬</span>' : ''}
          </div>
          <div class="recent-item-url">${this.getDomainFromUrl(marker.url)}</div>
          <div class="recent-item-time">${this.formatTime(marker.timestamp)}</div>
        </div>
        <div class="recent-item-actions">
          <button class="recent-go-btn" onclick="window.pageMarkPopup.goToMarker('${marker.id}', '${marker.url}')">Go</button>
          <button class="recent-delete-btn" onclick="window.pageMarkPopup.deleteMarker('${marker.id}', '${marker.url}')">×</button>
        </div>
      </div>
    `).join('');
  }

  async goToMarker(markerId, url) {
    try {
      // Check if we're on the same page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url === url) {
        // Same page - send message to content script
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'scrollToMarker', 
          markerId: markerId 
        });
      } else {
        // Different page - navigate to the page first
        await chrome.tabs.update(tab.id, { url: url });
        
        // Wait for page to load, then scroll to marker
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'scrollToMarker', 
                markerId: markerId 
              });
            }, 1000);
          }
        });
      }
      
      // Close popup
      window.close();
    } catch (error) {
      console.error('Error going to marker:', error);
      this.showNotification('Error navigating to marker.');
    }
  }

  async deleteMarker(markerId, url) {
    try {
      // Remove from storage
      const result = await chrome.storage.local.get(['pagemark_markers']);
      const allMarkers = result.pagemark_markers || {};
      
      if (allMarkers[url]) {
        allMarkers[url] = allMarkers[url].filter(m => m.id !== markerId);
        await chrome.storage.local.set({ pagemark_markers: allMarkers });
      }
      
      // Update UI
      this.loadStats();
      this.loadRecentMarkers();
      
      // Try to remove visual marker if on same page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url === url) {
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'deleteMarker', 
          markerId: markerId 
        });
      }
      
      this.showNotification('Marker deleted successfully!');
    } catch (error) {
      console.error('Error deleting marker:', error);
      this.showNotification('Error deleting marker.');
    }
  }

  getDomainFromUrl(url) {
    try {
      const domain = new URL(url).hostname;
      const cleanDomain = domain.replace('www.', '');
      
      // Add chat interface indicators
      if (cleanDomain.includes('chat.openai.com')) return 'ChatGPT';
      if (cleanDomain.includes('gemini.google.com')) return 'Gemini';
      if (cleanDomain.includes('claude.ai')) return 'Claude';
      if (cleanDomain.includes('bard.google.com')) return 'Bard';
      
      return cleanDomain;
    } catch (error) {
      return 'Unknown page';
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
    notification.className = 'success-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.pageMarkPopup = new PageMarkPopup();
}); 