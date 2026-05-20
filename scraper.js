(function initEagleMenu() {
    if (document.getElementById('eagle-sniper-menu')) return;

    let defaultFolder = "Pinterest_Downloads";
    const pageTitleElement = document.querySelector('h1');
    
    if (pageTitleElement && pageTitleElement.innerText.trim() !== '') {
        defaultFolder = pageTitleElement.innerText.replace(/[<>:"/\\|?*\n\r]/g, '').trim();
    } else {
        const isSinglePinPage = /^\/([^\/]+\/)?(pin|story|idea|idea-pin)\/[a-zA-Z0-9_-]+\/?$/i.test(window.location.pathname);
        if (isSinglePinPage) {
            const match = window.location.pathname.match(/\/(?:pin|story|idea|idea-pin)\/([a-zA-Z0-9_-]+)/i);
            if (match) defaultFolder = "Pin_" + match[1];
        } else {
            const match = window.location.pathname.match(/\/([^\/]+)\/([^\/]+)\/?$/);
            if (match) defaultFolder = match[1] + "_" + match[2];
        }
    }

    const overlay = document.createElement('div');
    overlay.id = 'eagle-sniper-menu';
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 999999; font-family: sans-serif; backdrop-filter: blur(4px);`;

    const box = document.createElement('div');
    box.style.cssText = `background: #1e1e1e; color: #fff; width: 380px; padding: 25px; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 15px; border: 1px solid #333;`;

    // ORIGINAL MENU VIEW
    box.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <h3 style="margin: 0; color: #e60023; font-size: 18px;">🎯 Save to Pin Sniper</h3>
            <span id="eagle-close" style="cursor: pointer; font-size: 22px; color: #888; transition: color 0.2s;">&times;</span>
        </div>
        
        <div>
            <label style="font-size: 13px; font-weight: bold; color: #aaa; margin-bottom: 8px; display: block;">Save as Folder:</label>
            <input type="text" id="eagle-folder-name" placeholder="Type a folder name..." 
                style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #444; background: #2a2a2a; color: white; outline: none; box-sizing: border-box;">
        </div>

        <div style="display: flex; gap: 12px; margin-top: 10px;">
            <button id="eagle-auto-btn" style="flex: 1; padding: 12px; border-radius: 25px; border: none; background: #333; color: white; cursor: pointer; font-weight: bold; font-size: 13px; transition: background 0.2s;">Auto Name</button>
            <button id="eagle-save-btn" style="flex: 1; padding: 12px; border-radius: 25px; border: none; background: #e60023; color: white; cursor: pointer; font-weight: bold; font-size: 13px; transition: transform 0.1s;">Save to App</button>
        </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('eagle-close').onclick = () => overlay.remove();
    document.getElementById('eagle-close').onmouseover = function() { this.style.color = 'white'; };
    document.getElementById('eagle-close').onmouseout = function() { this.style.color = '#888'; };

    document.getElementById('eagle-auto-btn').onclick = () => {
        const input = document.getElementById('eagle-folder-name');
        input.value = defaultFolder;
        const btn = document.getElementById('eagle-auto-btn');
        btn.innerText = "Detected! ✨";
        btn.style.background = "#444";
        setTimeout(() => { btn.innerText = "Auto Name"; btn.style.background = "#333"; }, 1000);
    };

    const api = globalThis.browser || globalThis.chrome;

    const isHomeFeed = window.location.pathname === '/' || window.location.pathname.startsWith('/home');
    const pageHTML = document.documentElement.innerHTML.toLowerCase();
    const isPrivateBoard = pageHTML.includes('"privacy":"secret"') || 
                           pageHTML.includes('"is_secret_board":true') || 
                           document.querySelector('[aria-label*="Secret"]') !== null;
                           
    // FIX #1: Force browser to always handle scraping locally to bypass Electron background login walls
    const triggerFallback = true; 

    document.getElementById('eagle-save-btn').onclick = () => {
        const folderName = document.getElementById('eagle-folder-name').value.trim() || defaultFolder;
        
        // TRANSITION TO LOADING VIEW (Now safely keeps the header and X button!)
        box.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <h3 style="margin: 0; color: #e60023; font-size: 18px;">🎯 Save to Pin Sniper</h3>
                <span id="eagle-close-status" style="cursor: pointer; font-size: 22px; color: #888; transition: color 0.2s;">&times;</span>
            </div>

            <div style="text-align: center; padding: 10px;">
                <h3 id="eagle-status-title" style="margin: 0 0 10px 0; color: #00c853; font-size: 20px;">✔️ Sniping in Progress!</h3>
                <p id="eagle-status-desc" style="color: #aaa; font-size: 13px; margin-bottom: 25px;">Check your Electron app for live logs.</p>
                <button id="eagle-stop-btn" style="width: 100%; padding: 14px; border-radius: 25px; border: none; background: #d32f2f; color: white; cursor: pointer; font-weight: bold; font-size: 14px; transition: background 0.2s; box-shadow: 0 4px 15px rgba(211, 47, 47, 0.4);">🛑 STOP SCROLLING</button>
            </div>
        `;
        
        // Re-attach the close action for the new X button!
        document.getElementById('eagle-close-status').onclick = () => overlay.remove();
        document.getElementById('eagle-close-status').onmouseover = function() { this.style.color = 'white'; };
        document.getElementById('eagle-close-status').onmouseout = function() { this.style.color = '#888'; };

        const stopBtn = document.getElementById('eagle-stop-btn');
        const title = document.getElementById('eagle-status-title');
        const desc = document.getElementById('eagle-status-desc');
        let isStopping = false;

        if (triggerFallback) {
            title.innerText = "🔍 Scanning Local Feed...";
            title.style.color = "#ff9900";
            let links = new Set();
            let lastHeight = 0;
            let idleCount = 0;
            let isScraping = true;

            let localScrapeTimer = setInterval(() => {
                if (!isScraping) return;

                document.querySelectorAll('img[src*="pinimg.com/"]').forEach(img => {
                    let highResSrc = img.src.replace(/\/(?:\d+x|x)\//, '/originals/');
                    if (highResSrc.includes('/originals/')) links.add(highResSrc);
                });

                title.innerText = `🔍 Collected ${links.size} Images...`;
                window.scrollTo(0, document.body.scrollHeight);

                if (!window.sniperKeepGoing) {
                    if (document.body.scrollHeight === lastHeight) {
                        idleCount++;
                        // FIX #2: Increased from 2 to 5 to give slower hardware/Wi-Fi enough time to load more content before giving up
                        if (idleCount > 5) { 
                            clearInterval(localScrapeTimer);
                            isScraping = false;
                            sendHybridPayload(Array.from(links), folderName, title, stopBtn, desc);
                        }
                    } else {
                        idleCount = 0;
                        lastHeight = document.body.scrollHeight;
                    }
                }
            }, 1000);

            stopBtn.onclick = () => {
                if (isStopping) return;
                isStopping = true;
                isScraping = false;
                clearInterval(localScrapeTimer);
                stopBtn.innerText = "Sending Signal... ⏳";
                
                if (links.size > 0) {
                    sendHybridPayload(Array.from(links), folderName, title, stopBtn, desc);
                } else {
                    title.innerText = "❌ Cancelled.";
                    title.style.color = "#d32f2f";
                    setTimeout(() => overlay.remove(), 1000);
                }
            };

        } else {
            api.runtime.sendMessage({
                action: "sendToElectron",
                payload: {
                    url: window.location.href,
                    keepGoing: window.sniperKeepGoing || false, 
                    fastMode: window.sniperFastMode || false,
                    customName: folderName
                }
            }).then((response) => {
                if (!response || !response.success) {
                    triggerConnectionError(title, stopBtn, desc);
                } else {
                    startStatusPolling(title, stopBtn);
                }
            }).catch(() => {
                triggerConnectionError(title, stopBtn, desc);
            });

            stopBtn.onclick = () => {
                if (isStopping) return;
                isStopping = true;
                stopBtn.innerText = "Sending Signal... ⏳";
                api.runtime.sendMessage({ action: "stopElectron" }).then(() => {
                    isStopping = false; 
                }).catch(() => { isStopping = false; });
            };
        }
    };

    function triggerConnectionError(titleElement, stopBtnElement, descElement) {
        titleElement.innerText = "⚠️ Connection Failed"; 
        titleElement.style.color = "#d32f2f";
        descElement.innerText = "Please ensure the Pin Sniper background app is running.";
        stopBtnElement.style.display = "none";
    }

    function sendHybridPayload(directLinks, customName, titleElement, stopBtnElement, descElement) {
        titleElement.innerText = "🚀 Beam to Background App...";
        api.runtime.sendMessage({
            action: "sendToElectron",
            payload: {
                mode: "direct",
                directLinks: directLinks,
                customName: customName,
                fastMode: window.sniperFastMode || false
            }
        }).then((response) => {
            if (!response || !response.success) {
                triggerConnectionError(titleElement, stopBtnElement, descElement);
            } else {
                startStatusPolling(titleElement, stopBtnElement);
            }
        }).catch(() => {
            triggerConnectionError(titleElement, stopBtnElement, descElement);
        });
    }

    function startStatusPolling(titleElement, stopBtnElement) {
        let isStopping = false;
        let pollInterval = setInterval(() => {
            api.runtime.sendMessage({ action: "getStatus" }).then((res) => {
                if (res && res.success && res.state) {
                    
                    if (res.state.phase === 'downloading') {
                        titleElement.innerText = "⏳ Downloading Pins...";
                        titleElement.style.color = "#ff9900"; 
                        if (!isStopping) {
                            stopBtnElement.innerText = "🛑 CANCEL DOWNLOADS";
                            stopBtnElement.style.background = "#ff9900";
                            stopBtnElement.style.boxShadow = "0 4px 15px rgba(255, 153, 0, 0.4)";
                        }
                    
                    } else if (res.state.phase === 'finished') {
                        titleElement.innerText = "🏆 Sniper Finished!";
                        titleElement.style.color = "#00c853"; 
                        stopBtnElement.innerText = "Done! ✔️";
                        stopBtnElement.style.background = "#555";
                        stopBtnElement.style.boxShadow = "none";
                        clearInterval(pollInterval);
                        setTimeout(() => overlay.remove(), 2500);
                    }
                }
            });
        }, 1000);
        
        stopBtnElement.onclick = () => {
            isStopping = true;
            stopBtnElement.innerText = "Sending Signal... ⏳";
            api.runtime.sendMessage({ action: "stopElectron" });
        };
    }
})();
