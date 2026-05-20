// We will store the exact folder paths here momentarily while Chrome starts the download
const activeDownloads = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveFile") {
    
    chrome.downloads.download({
      url: message.dataUrl,
      saveAs: false 
    }, (downloadId) => {
      if (downloadId) {
        // Link this specific download ID to your folder path
        activeDownloads[downloadId] = message.filename;
      }
    });
  }
});

// 🛑 THE INTERCEPTOR 🛑
// This catches the file right before Chrome saves it and forces the folder structure
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (activeDownloads[item.id]) {
    // We found our pin! Force Chrome to use our exact folder name
    suggest({
      filename: activeDownloads[item.id],
      conflictAction: "uniquify" // If a file with that name already exists, add a (1) to it
    });
    
    // Clean up our memory
    delete activeDownloads[item.id];
  } else {
    // If it's just a normal download (like you downloading a PDF), let it act normally
    suggest();
  }
  
  // This tells Chrome to wait for our suggestion
  return true; 
});