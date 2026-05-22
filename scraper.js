function initEagleMenu() {
    const existingMenu = document.getElementById('eagle-sniper-menu');
    if (existingMenu) existingMenu.remove();

    const isSinglePinPage = /\/(pin|story|idea|idea-pin)\/[a-zA-Z0-9_-]+/i.test(window.location.pathname);

    function getAutoName() {
        try {
            let name = "Pinterest_Downloads";
            const pageTitleElement = document.querySelector('h1');
            if (pageTitleElement && pageTitleElement.innerText.trim() !== '') {
                name = pageTitleElement.innerText.replace(/[<>:"/\\|?*\n\r]/g, '').trim();
            } else {
                if (isSinglePinPage) {
                    const match = window.location.pathname.match(/\/(?:pin|story|idea|idea-pin)\/([a-zA-Z0-9_-]+)/i);
                    if (match) name = "Pin_" + match[1];
                } else {
                    const match = window.location.pathname.match(/\/([^\/]+)\/([^\/]+)\/?$/);
                    if (match) name = match[1] + "_" + match[2];
                }
            }
            return name;
        } catch (e) {
            return "Pinterest_Downloads";
        }
    }

    const overlay = document.createElement('div');
    overlay.id = 'eagle-sniper-menu';
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; backdrop-filter: blur(5px);`;

    const box = document.createElement('div');
    box.style.cssText = `background: #1e1e1e; color: #fff; width: 380px; padding: 25px; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 15px; border: 1px solid #333;`;

    box.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <h3 style="margin: 0; color: #e60023; font-size: 18px;">🎯 Save to Pin Sniper</h3>
            <span id="eagle-close" style="cursor: pointer; font-size: 22px; color: #888; transition: color 0.2s;">&times;</span>
        </div>
        
        <div>
            <label style="font-size: 13px; font-weight: bold; color: #aaa; margin-bottom: 8px; display: block;">Save as Folder:</label>
            <input type="text" id="eagle-folder-name" value="${getAutoName()}" placeholder="Type a folder name..." 
                style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #444; background: #2a2a2a; color: white; outline: none; box-sizing: border-box;">
        </div>

        <div id="action-buttons" style="display: flex; gap: 12px; margin-top: 10px;">
            <button id="eagle-auto-btn" style="flex: 1; padding: 12px; border-radius: 25px; border: none; background: #333; color: white; cursor: pointer; font-weight: bold; font-size: 13px; transition: background 0.2s;">Auto Name</button>
            <button id="eagle-save-btn" style="flex: 1; padding: 12px; border-radius: 25px; border: none; background: #e60023; color: white; cursor: pointer; font-weight: bold; font-size: 13px; transition: transform 0.1s;">Save to App</button>
        </div>
        
        <div id="status-container" style="display: none; text-align: center; padding: 10px;">
            <h3 id="eagle-status-title" style="margin: 0 0 10px 0; color: #ff9900; font-size: 20px;">🔍 Scanning Local Feed...</h3>
            <p id="eagle-status-desc" style="color: #aaa; font-size: 13px; margin-bottom: 25px;">Check your background app for live logs.</p>
            <button id="eagle-stop-btn" style="width: 100%; padding: 14px; border-radius: 25px; border: none; background: #d32f2f; color: white; cursor: pointer; font-weight: bold; font-size: 14px; transition: background 0.2s; box-shadow: 0 4px 15px rgba(211, 47, 47, 0.4);">🛑 STOP SCROLLING</button>
        </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('eagle-close').onclick = () => overlay.remove();
    document.getElementById('eagle-close').onmouseover = function() { this.style.color = 'white'; };
    document.getElementById('eagle-close').onmouseout = function() { this.style.color = '#888'; };

    document.getElementById('eagle-auto-btn').onclick = () => {
        document.getElementById('eagle-folder-name').value = getAutoName();
        const btn = document.getElementById('eagle-auto-btn');
        btn.innerText = "Detected! ✨";
        btn.style.background = "#444";
        setTimeout(() => { btn.innerText = "Auto Name"; btn.style.background = "#333"; }, 1000);
    };

    let directMedia = new Set();
    let pinsToDeepFetch = new Set();
    const api = globalThis.browser || globalThis.chrome;

    function cleanAndUpgrade(url) {
        if (!url) return null;
        let clean = url.split('?')[0]; 
        if (clean.includes('pinimg.com')) {
            clean = clean.replace(/\/(?:\d+x\d*|x|rs_[^/]+|736x|564x|474x|236x)\//g, '/originals/');
        }
        return clean;
    }

    // =================================================================
    // 🛠️ ISOLATED ENGINE 1: The Deep Media JSON Extractor
    // =================================================================
    function extractMedia(rawText) {
        if (!rawText) return null;
        // Clean up escaped JSON strings and HTML entities so regex doesn't miss anything
        let cleanText = rawText.replace(/\\u002F/g, '/').replace(/\\\//g, '/').replace(/\\"/g, '"').replace(/&quot;/g, '"');
        
        let mp4s = cleanText.match(/https:\/\/[^"'\s<>]*?\.mp4/gi);
        if (mp4s) {
            let valid = mp4s.filter(m => !m.includes('log_item') && !m.includes('/v2/') && !m.includes('audio'));
            if (valid.length > 0) {
                let hd = valid.find(m => m.includes('1080') || m.includes('720p') || m.includes('expMp4') || m.includes('v1'));
                return hd ? hd : valid[valid.length - 1];
            }
        }

        let hls = cleanText.match(/https:\/\/[^"'\s<>]*?\.m3u8/gi);
        if (hls) {
            let validHls = hls.filter(m => !m.includes('audio') && !m.match(/_\d+w\.m3u8/));
            if (validHls.length > 0) return validHls[0];
        }

        let imgs = cleanText.match(/https:\/\/[^"'\s<>]*?\.pinimg\.com\/[^"'\s<>]*?\.(?:jpg|png|webp|gif)/gi);
        if (imgs) {
            let originals = imgs.filter(m => m.includes('/originals/'));
            if (originals.length > 0) return originals[0];
            return cleanAndUpgrade(imgs[0]); 
        }

        return null;
    }

    // =================================================================
    // 🛠️ ISOLATED ENGINE 2: The Board Grid Scanner (DOM Order)
    // =================================================================
    function sweepBoardPins() {
        let added = false;
        let isBelowCutoff = false;
        
        const elements = document.querySelectorAll('h2, h3, h4, div[data-test-id="related-pins-heading"], a[href*="/pin/"], a[href*="/idea/"]');
        
        for (let el of elements) {
            if (el.tagName !== 'A' && el.innerText) {
                let txt = el.innerText.toLowerCase().trim();
                if (['more like this', 'more ideas', 'more to explore', 'related pins', 'ideas you might like'].includes(txt)) {
                    isBelowCutoff = true; 
                }
                continue;
            }

            if (el.tagName === 'A') {
                if (isBelowCutoff) continue; 
                
                let rect = el.getBoundingClientRect();
                if (rect.height < 20) continue; 
                
                let href = el.href.split('?')[0];
                
                let isAd = false;
                let parent = el.parentElement;
                for (let i = 0; i < 5; i++) {
                    if (parent && parent.innerText && (parent.innerText.includes('Promoted') || parent.innerText.includes('Sponsored'))) {
                        isAd = true; break;
                    }
                    if (parent) parent = parent.parentElement;
                }
                if (isAd) continue;

                let htmlStr = el.innerHTML.toLowerCase();
                let isVideo = htmlStr.includes('<video') || 
                              htmlStr.includes('/videos/') || 
                              htmlStr.includes('play') || 
                              htmlStr.includes('duration') || 
                              /\b\d{1,2}:\d{2}\b/.test(el.innerText || ''); 
                
                if (isVideo) {
                    if (!pinsToDeepFetch.has(href)) {
                        pinsToDeepFetch.add(href);
                        added = true;
                    }
                } else {
                    let img = el.querySelector('img');
                    if (img && img.src && img.src.includes('pinimg.com')) {
                        let highRes = cleanAndUpgrade(img.src);
                        if (!directMedia.has(highRes)) {
                            directMedia.add(highRes);
                            added = true;
                        }
                    } else {
                        if (!pinsToDeepFetch.has(href)) {
                            pinsToDeepFetch.add(href);
                            added = true;
                        }
                    }
                }
            }
        }
        return added;
    }

    async function resolveDeepLinks(titleElement) {
        let urls = Array.from(pinsToDeepFetch);
        for (let i = 0; i < urls.length; i++) {
            titleElement.innerText = `🔍 Authenticating Video ${i+1}/${urls.length}...`;
            try {
                let res = await fetch(urls[i], { credentials: 'same-origin' });
                let html = await res.text();
                let url = extractMedia(html);
                if (url) directMedia.add(url);
                await new Promise(r => setTimeout(r, 250)); 
            } catch(e) {}
        }
    }

    // =================================================================
    // 🚀 EXECUTION: Routing traffic to the correct engine
    // =================================================================
    document.getElementById('eagle-save-btn').onclick = async () => {
        document.getElementById('action-buttons').style.display = 'none';
        document.getElementById('status-container').style.display = 'block';
        
        const stopBtn = document.getElementById('eagle-stop-btn');
        const title = document.getElementById('eagle-status-title');
        const desc = document.getElementById('eagle-status-desc');
        let isStopping = false;

        // 🎯 ROUTE A: SINGLE PIN ISOLATION
        if (isSinglePinPage) {
            title.innerText = "🎯 Single Pin Locked!";
            title.style.color = "#00c853";
            desc.innerText = "Extracting clean asset stream...";
            
            directMedia.clear();
            pinsToDeepFetch.clear();

            let url = null;
            let rawData = document.documentElement.innerHTML;

            // Tier 1: Try Deep HTML Extraction first
            url = extractMedia(rawData);

            // Tier 2: Unbreakable Meta Video Fallback
            if (!url) {
                let metaVideo = document.querySelector('meta[property="og:video:secure_url"]') || document.querySelector('meta[name="og:video"]');
                if (metaVideo && metaVideo.content && metaVideo.content.includes('.mp4')) {
                    url = metaVideo.content;
                }
            }

            // Tier 3: Unbreakable Meta Image Fallback
            if (!url) {
                let metaImg = document.querySelector('meta[property="og:image"]');
                if (metaImg && metaImg.content) url = cleanAndUpgrade(metaImg.content);
            }

            if (url) {
                directMedia.add(url);
            }

            let finalLinks = Array.from(directMedia);
            setTimeout(() => sendPayload(finalLinks, title, stopBtn, desc), 500);

        } 
        // 🎯 ROUTE B: BOARD ISOLATION
        else {
            sweepBoardPins();
            title.innerText = `🔍 Collected ${directMedia.size + pinsToDeepFetch.size} Pins...`;
            
            const observer = new MutationObserver(() => {
                if (isStopping) return;
                if (sweepBoardPins()) title.innerText = `🔍 Collected ${directMedia.size + pinsToDeepFetch.size} Pins...`;
            });

            observer.observe(document.body, { childList: true, subtree: true });

            let scrollAttempts = 0;
            let lastHeight = 0;
            let idleCount = 0;

            const autoScroll = setInterval(async () => {
                if (isStopping) return;

                window.scrollTo(0, document.body.scrollHeight);
                scrollAttempts++;

                if (document.body.scrollHeight === lastHeight) {
                    idleCount++;
                } else {
                    idleCount = 0;
                    lastHeight = document.body.scrollHeight;
                }

                const isFastMode = window.sniperFastMode === true;
                const isInfinite = window.sniperKeepGoing === true;
                const maxScrolls = isFastMode ? 15 : 60;

                if ((!isInfinite && scrollAttempts >= maxScrolls) || idleCount > 8) {
                    clearInterval(autoScroll);
                    observer.disconnect();
                    isStopping = true;
                    
                    sweepBoardPins(); 
                    if (pinsToDeepFetch.size > 0) await resolveDeepLinks(title);
                    
                    let finalLinks = Array.from(directMedia);
                    title.innerText = `🚧 Stopped! (${finalLinks.length} Pins)`;
                    title.style.color = "#00c853";
                    setTimeout(() => sendPayload(finalLinks, title, stopBtn, desc), 1000);
                }
            }, 1000);

            stopBtn.onclick = async () => {
                if (isStopping) return;
                isStopping = true;
                clearInterval(autoScroll);
                observer.disconnect();
                
                sweepBoardPins();
                if (pinsToDeepFetch.size > 0) await resolveDeepLinks(title);

                let finalLinks = Array.from(directMedia);
                stopBtn.innerText = "Stopping... ⏳";
                title.innerText = `🚧 Stopped! (${finalLinks.length} Pins)`;
                setTimeout(() => sendPayload(finalLinks, title, stopBtn, desc), 1000);
            };
        }
    };

    function sendPayload(directLinks, titleElement, stopBtnElement, descElement) {
        if (directLinks.length === 0) {
            titleElement.innerText = "❌ No Pins Found";
            titleElement.style.color = "#d32f2f";
            stopBtnElement.innerText = "Close";
            stopBtnElement.style.background = "#333";
            stopBtnElement.style.boxShadow = "none";
            stopBtnElement.onclick = () => document.getElementById('eagle-sniper-menu').remove();
            return;
        }

        titleElement.innerText = `🚀 Beaming ${directLinks.length} Pins to App...`;
        
        api.runtime.sendMessage({
            action: "sendToElectron",
            payload: {
                customName: document.getElementById('eagle-folder-name').value.trim(),
                directLinks: directLinks
            }
        }).then((response) => {
            if (!response || !response.success) {
                titleElement.innerText = "⚠️ Connection Failed"; 
                titleElement.style.color = "#d32f2f";
                descElement.innerText = "Please ensure the desktop app is running.";
                stopBtnElement.style.display = "none";
            } else {
                startStatusPolling(titleElement, stopBtnElement, directLinks.length);
            }
        }).catch(() => {});
    }

    function startStatusPolling(titleElement, stopBtnElement, totalPins) {
        let isStopping = false;
        let pollInterval = setInterval(() => {
            api.runtime.sendMessage({ action: "getStatus" }).then((res) => {
                if (res && res.success && res.state) {
                    if (res.state.phase === 'downloading') {
                        let currentProgress = res.state.downloaded || 0;
                        titleElement.innerText = `⏳ Download: ${currentProgress} / ${totalPins} Done`;
                        titleElement.style.color = "#ff9900"; 
                        if (!isStopping) {
                            stopBtnElement.innerText = "🛑 CANCEL DOWNLOADS";
                            stopBtnElement.style.background = "#ff9900";
                            stopBtnElement.style.boxShadow = "0 4px 15px rgba(255, 153, 0, 0.4)";
                        }
                    } else if (res.state.phase === 'finished') {
                        titleElement.innerText = `🏆 Pack Complete! (${totalPins} Files)`;
                        titleElement.style.color = "#00c853"; 
                        stopBtnElement.innerText = "Done! ✔️";
                        stopBtnElement.style.background = "#555";
                        stopBtnElement.style.boxShadow = "none";
                        clearInterval(pollInterval);
                        setTimeout(() => document.getElementById('eagle-sniper-menu').remove(), 2500);
                    }
                }
            }).catch(() => {});
        }, 1000);
        
        stopBtnElement.onclick = () => {
            isStopping = true;
            stopBtnElement.innerText = "Sending Signal... ⏳";
            api.runtime.sendMessage({ action: "stopElectron" });
        };
    }
}

const api = globalThis.browser || globalThis.chrome;
api.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "wake_up_sniper") {
        window.sniperKeepGoing = request.keepGoing;
        window.sniperFastMode = request.fastMode;
        initEagleMenu();
        sendResponse({ success: true });
    }
    return true;
});
