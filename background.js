// PageMark Background Service Worker
// Handles extension lifecycle and background tasks

// Install event - set up extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time installation
    console.log('PageMark extension installed successfully!');
    
    // Initialize storage
    chrome.storage.local.set({
      pagemark_markers: {},
      pagemark_settings: {
        autoSave: true,
        showVisualMarkers: true,
        keyboardShortcuts: true
      }
    });
    
    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('PageMark extension updated!');
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getStats':
      getStats().then(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'clearAllMarkers':
      clearAllMarkers().then(sendResponse);
      return true;
      
    case 'exportMarkers':
      exportMarkers().then(sendResponse);
      return true;
      
    case 'importMarkers':
      importMarkers(request.data).then(sendResponse);
      return true;
  }
});

// Get extension statistics
async function getStats() {
  try {
    const result = await chrome.storage.local.get(['pagemark_markers']);
    const allMarkers = result.pagemark_markers || {};
    
    let totalMarkers = 0;
    let totalPages = 0;
    let totalStorage = 0;
    
    Object.entries(allMarkers).forEach(([url, markers]) => {
      totalMarkers += markers.length;
      if (markers.length > 0) {
        totalPages++;
        totalStorage += JSON.stringify(markers).length;
      }
    });
    
    return {
      success: true,
      stats: {
        totalMarkers,
        totalPages,
        totalStorage: Math.round(totalStorage / 1024) // KB
      }
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { success: false, error: error.message };
  }
}

// Clear all markers
async function clearAllMarkers() {
  try {
    await chrome.storage.local.set({ pagemark_markers: {} });
    return { success: true };
  } catch (error) {
    console.error('Error clearing markers:', error);
    return { success: false, error: error.message };
  }
}

// Export markers to JSON
async function exportMarkers() {
  try {
    const result = await chrome.storage.local.get(['pagemark_markers']);
    const allMarkers = result.pagemark_markers || {};
    
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      markers: allMarkers
    };
    
    return {
      success: true,
      data: exportData
    };
  } catch (error) {
    console.error('Error exporting markers:', error);
    return { success: false, error: error.message };
  }
}

// Import markers from JSON
async function importMarkers(importData) {
  try {
    // Validate import data
    if (!importData || !importData.markers) {
      throw new Error('Invalid import data format');
    }
    
    // Merge with existing markers
    const result = await chrome.storage.local.get(['pagemark_markers']);
    const existingMarkers = result.pagemark_markers || {};
    
    const mergedMarkers = { ...existingMarkers };
    
    Object.entries(importData.markers).forEach(([url, markers]) => {
      if (mergedMarkers[url]) {
        // Merge markers for existing URL
        const existingIds = new Set(mergedMarkers[url].map(m => m.id));
        const newMarkers = markers.filter(m => !existingIds.has(m.id));
        mergedMarkers[url] = [...mergedMarkers[url], ...newMarkers];
      } else {
        // Add new URL markers
        mergedMarkers[url] = markers;
      }
    });
    
    await chrome.storage.local.set({ pagemark_markers: mergedMarkers });
    
    return { success: true };
  } catch (error) {
    console.error('Error importing markers:', error);
    return { success: false, error: error.message };
  }
}

// Handle tab updates to restore markers
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if we have markers for this URL
    chrome.storage.local.get(['pagemark_markers'], (result) => {
      const allMarkers = result.pagemark_markers || {};
      const markers = allMarkers[tab.url];
      
      if (markers && markers.length > 0) {
        // Notify content script that markers exist for this page
        chrome.tabs.sendMessage(tabId, {
          action: 'markersAvailable',
          count: markers.length
        }).catch(() => {
          // Content script not ready yet, ignore
        });
      }
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will only trigger if no popup is defined
  // Since we have a popup, this won't be called
  console.log('Extension icon clicked');
});

// Handle context menu (if needed in future)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'pagemark-save-position',
    title: 'Save current position',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'pagemark-show-markers',
    title: 'Show saved markers',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'pagemark-save-position') {
    chrome.tabs.sendMessage(tab.id, { action: 'savePosition' });
  } else if (info.menuItemId === 'pagemark-show-markers') {
    chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
  }
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.pagemark_markers) {
    // Notify all tabs about marker changes
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'markersUpdated'
        }).catch(() => {
          // Tab might not have content script, ignore
        });
      });
    });
  }
});

// Handle uninstall
chrome.runtime.setUninstallURL('https://github.com/your-repo/pagemark'); 