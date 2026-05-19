console.log("🎯 Pin Sniper Background Bridge is active!");

const api = globalThis.browser || globalThis.chrome;

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendToElectron") {
    fetch('http://127.0.0.1:31337/snipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message.payload)
    })
    .then(res => sendResponse({ success: res.ok }))
    .catch(err => sendResponse({ success: false }));
    return true; 
  }

  if (message.action === "stopElectron") {
    fetch('http://127.0.0.1:31337/stop', { method: 'POST' })
    .then(res => sendResponse({ success: res.ok }))
    .catch(err => sendResponse({ success: false }));
    return true;
  }

  // NEW: The Live Status Tracker
  if (message.action === "getStatus") {
    fetch('http://127.0.0.1:31337/status')
    .then(res => res.json())
    .then(data => sendResponse({ success: true, state: data }))
    .catch(err => sendResponse({ success: false }));
    return true;
  }
});