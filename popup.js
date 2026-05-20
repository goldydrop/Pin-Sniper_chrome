// Make sure Max Quality and Fast Mode can't both be checked at the same time
document.getElementById('highQualityCheck').addEventListener('change', (e) => {
    if (e.target.checked) document.getElementById('fastModeCheck').checked = false;
});
document.getElementById('fastModeCheck').addEventListener('change', (e) => {
    if (e.target.checked) document.getElementById('highQualityCheck').checked = false;
});

// 1. THE START BUTTON
document.getElementById('downloadBtn').addEventListener('click', () => {
    const keepGoing = document.getElementById('continueCheck').checked;
    const ads = document.getElementById('adsCheck').checked;
    const hq = document.getElementById('highQualityCheck').checked;
    const fast = document.getElementById('fastModeCheck').checked;
    const videoGifOnly = document.getElementById('videoGifOnlyCheck').checked; // Grab new mode

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            func: (k, a, hqMode, fastMode, vgoMode) => {
                window.continuePastBarrier = k;
                window.includeAds = a;
                window.highQualityMode = hqMode;
                window.fastDownloadMode = fastMode;
                window.videoGifOnlyMode = vgoMode; // Pass it to scraper.js
            },
            args: [keepGoing, ads, hq, fast, videoGifOnly]
        }, () => {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                files: ['scraper.js']
            });
        });
    });
});

// 2. THE STOP BUTTON
document.getElementById('stopBtn').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "stopScraping" });
    });
});