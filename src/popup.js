document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('closeDuplicatesBtn').addEventListener('click', handleCloseDuplicates);
});

// Main function to handle the duplicate tab closing process
function handleCloseDuplicates() {
    showStatus("Scanning for duplicates...");

    chrome.tabs.query({}, function(tabs) {
        if (!canAccessTabUrls(tabs)) {
            showStatus("Error: Cannot access tab URLs. Check extension permissions.");
            return;
        }

        const tabsToClose = findDuplicateTabs(tabs);
        closeDuplicateTabs(tabsToClose);
    });
}

// Check if we have permission to access tab URLs
function canAccessTabUrls(tabs) {
    return !(tabs.length > 0 && tabs[0].url === undefined);
}

// Find duplicate tabs and determine which ones to close
function findDuplicateTabs(tabs) {
    // Filter out tabs without valid URLs
    const validTabs = tabs.filter(tab => tab.url && tab.url.trim() !== "");

    // Group tabs by URL
    const urlMap = groupTabsByUrl(validTabs);

    // Determine which tabs to close
    return determineTabsToClose(urlMap);
}

// Group tabs by their URLs
function groupTabsByUrl(tabs) {
    const urlMap = new Map();

    tabs.forEach(tab => {
        if (!urlMap.has(tab.url)) {
            urlMap.set(tab.url, []);
        }
        urlMap.get(tab.url).push(tab);
    });

    return urlMap;
}

// Determine which tabs should be closed for each URL group
function determineTabsToClose(urlMap) {
    const tabsToClose = [];

    urlMap.forEach((tabsWithSameUrl, url) => {
        if (tabsWithSameUrl.length > 1) {
            // First check for active tab
            const activeTab = tabsWithSameUrl.find(tab => tab.active);

            if (activeTab) {
                // Keep active tab, close others
                collectNonActiveTabs(tabsWithSameUrl, activeTab.id, tabsToClose);
            } else {
                // Keep most recent tab (highest index), close others
                keepMostRecentTab(tabsWithSameUrl, tabsToClose);
            }
        }
    });

    return tabsToClose;
}

// Collect all tabs except the active one
function collectNonActiveTabs(tabs, activeTabId, tabsToClose) {
    tabs.forEach(tab => {
        if (tab.id !== activeTabId) {
            tabsToClose.push(tab.id);
        }
    });
}

// Keep the tab with the highest index (most recent) and close others
function keepMostRecentTab(tabs, tabsToClose) {
    // Sort by index (descending)
    tabs.sort((a, b) => b.index - a.index);

    // Keep the first tab, close others
    const keepTabId = tabs[0].id;
    tabs.forEach(tab => {
        if (tab.id !== keepTabId) {
            tabsToClose.push(tab.id);
        }
    });
}

// Close the duplicate tabs and show results
function closeDuplicateTabs(tabIds) {
    if (tabIds.length === 0) {
        showStatus("No duplicate tabs found.");
        return;
    }

    chrome.tabs.remove(tabIds, function() {
        if (chrome.runtime.lastError) {
            showStatus(`Error: ${chrome.runtime.lastError.message}`);
        } else {
            showStatus(`Closed ${tabIds.length} duplicate tab(s).`);
        }
    });
}

// Update status message
function showStatus(message) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');
}
