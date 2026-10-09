chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// El botón inyectado en Drive (content.js) pide abrir el panel; el clic del usuario viaja con el mensaje.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg === 'open-panel' && sender.tab) chrome.sidePanel.open({ windowId: sender.tab.windowId });
});
