const MENU_ID = 'anki-assistant-send-to-anki';

const sendTriggerToTab = async (tabId: number) => {
  try {
    // Check if tab is accessible before sending message
    const tab = await chrome.tabs.get(tabId);
    
    // Only send to normal web pages (not chrome://, chrome-extension://, etc.)
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.warn('[contextMenus] Cannot trigger on special pages:', tab.url);
      return;
    }
    
    await chrome.tabs.sendMessage(tabId, { type: 'capture:trigger' });
  } catch (error) {
    console.error('[contextMenus] Failed to send trigger message', error);
  }
};

export const registerContextMenus = () => {
  if (!chrome.contextMenus) {
    console.warn('[contextMenus] chrome.contextMenus API unavailable');
    return;
  }

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: '发送到 Anki',
      contexts: ['selection']
    });
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== MENU_ID || !tab?.id) {
      return;
    }
    await sendTriggerToTab(tab.id);
  });
};

export const registerCommandListener = () => {
  if (!chrome.commands) {
    console.warn('[contextMenus] chrome.commands API unavailable');
    return;
  }

  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'trigger-capture') {
      return;
    }

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      await sendTriggerToTab(activeTab.id);
    }
  });
};
