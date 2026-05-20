// THE WALKIE-TALKIE RECEIVER
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "stopScraping") {
      window.stopPinterestScraper = true; 
      console.log("🛑 Received EMERGENCY STOP from popup!");
  }
});

(async function scrapePinterestBoard() {
  window.stopPinterestScraper = false; 

  const mediaMap = new Map();
  const keepGoing = window.continuePastBarrier || false; 
  const includeAds = window.includeAds || false; 
  const maxQuality = window.highQualityMode || false;
  const fastMode = window.fastDownloadMode || false;
  const videoGifOnly = window.videoGifOnlyMode || false; // Catch the new flag
  
  let userInput = prompt("What folder do you want to save these pins in?\n(Leave blank to just save to your normal Downloads folder)", "Pinterest Board");
  const folderName = (userInput || "").replace(/[<>:"/\\|?*]+/g, '').trim();

  const logHistory = [];
  function addLog(message) {
    console.log(message); 
    logHistory.push(message); 
  }

  const barrierPhrases = [
    "more like this", "more ideas for this board", 
    "you might also like", "more to explore", 
    "related pins", "similar ideas", "find more ideas"
  ];

  let absoluteBarrierY = Infinity; 
  addLog("--- STARTING NEW SCRAPE ---");
  if (videoGifOnly) addLog("🎬 Video/GIF Only Mode is ACTIVE. Ignoring all static images.");

  function extractMediaFromElement(el) {
      const rect = el.getBoundingClientRect();
      const elY = rect.top + window.scrollY;
      
      if (elY > absoluteBarrierY + 100) return; 

      let urls = [];
      
      if (el.src && typeof el.src === 'string' && !el.src.startsWith('data:')) urls.push(el.src);
      if (el.currentSrc && typeof el.currentSrc === 'string' && !el.currentSrc.startsWith('data:')) urls.push(el.currentSrc);
      
      if (el.srcset) {
          el.srcset.split(',').forEach(part => {
              let u = part.trim().split(' ')[0];
              if (u && !u.startsWith('data:')) urls.push(u);
          });
      }
      
      if (el.attributes) {
          Array.from(el.attributes).forEach(attr => {
              if (attr.value && attr.value.includes('pinimg.com') && !attr.value.startsWith('data:')) {
                  let matches = attr.value.match(/https:\/\/[^"'\s]+\.pinimg\.com\/[^"'\s]+/g);
                  if (matches) urls.push(...matches);
              }
          });
      }

      let style = window.getComputedStyle(el);
      if (style.backgroundImage && style.backgroundImage !== 'none') {
          let match = style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
          if (match && match[1] && !match[1].startsWith('data:')) urls.push(match[1]);
      }

      if (el.tagName && el.tagName.toLowerCase() === 'video') {
          let poster = el.getAttribute('poster');
          if (poster && poster.includes('pinimg.com')) urls.push(poster);
      }

      urls = urls.filter(u => u.includes('pinimg.com'));
      urls = urls.filter(u => !u.includes('/75x75/') && !u.includes('/150x150/') && !u.includes('_RS'));
      urls = urls.filter(u => u.match(/\.(jpg|jpeg|png|webp|gif|mp4|m3u8)$/i) || u.includes('v.pinimg.com'));

      if (urls.length === 0) return;

      let isAd = false;
      let parent = el.parentElement;
      for (let i = 0; i < 6; i++) { 
        if (parent) {
          if (parent.innerText && parent.innerText.includes('Promoted')) { isAd = true; break; }
          parent = parent.parentElement;
        }
      }
      if (isAd && !includeAds) return;

      urls.forEach(u => {
          let cleanUrl = u.split('?')[0];
          let isVideo = cleanUrl.includes('.mp4') || cleanUrl.includes('.m3u8') || cleanUrl.includes('v.pinimg.com');
          let isGif = cleanUrl.toLowerCase().endsWith('.gif');

          // 🎬 THE VIDEO/GIF FILTER 🎬
          // If the mode is ON, and it's NOT a video, and it's NOT a gif... skip it entirely!
          if (videoGifOnly && !isVideo && !isGif) {
              return; 
          }
          
          let highResUrl = cleanUrl;
          if (!isVideo && cleanUrl.match(/\/\d+x\//)) {
              highResUrl = cleanUrl.replace(/\/\d+x\//, '/originals/');
          }

          let pinId = highResUrl; 
          let linkTag = el.closest('a');
          if (linkTag && linkTag.href.includes('/pin/')) pinId = linkTag.href; 

          mediaMap.set(pinId, { 
              fallback: cleanUrl, 
              original: highResUrl, 
              type: isVideo ? 'video' : 'img' 
          });
      });
  }

  while (true) {
    if (window.stopPinterestScraper) {
      addLog("🛑 Manual Stop: Ending scroll and starting downloads for found pins...");
      window.stopPinterestScraper = false; 
      break; 
    }

    let hitBarrier = false;

    if (!keepGoing) {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, span, div, p'); 
      for (const el of headings) {
        if (el.innerText) {
          const text = el.innerText.trim().toLowerCase();
          if (barrierPhrases.includes(text)) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                  hitBarrier = true;
                  absoluteBarrierY = rect.top + window.scrollY; 
                  addLog(`Hit the barrier EXACTLY: "${text}". Tripwire safely set.`);
                  break;
              }
          }
        }
      }
    }

    if (hitBarrier) {
         window.scrollBy(0, 500); 
         await new Promise(resolve => setTimeout(resolve, 2500)); 
         document.querySelectorAll('img, video, source, div, picture').forEach(el => extractMediaFromElement(el));
         break; 
    }

    document.querySelectorAll('img, video, source, div, picture').forEach(el => extractMediaFromElement(el));
    window.scrollBy(0, window.innerHeight); 
    await new Promise(resolve => setTimeout(resolve, 800)); 
    
    let currentScrollPos = window.scrollY + window.innerHeight;
    if (currentScrollPos >= document.body.scrollHeight) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
            break; 
        }
    }
  }

  const mediaEntries = Array.from(mediaMap.values());
  if (mediaEntries.length === 0) {
    alert("No pins found! (If Video/GIF Only mode is on, there might not be any on this board).");
    return;
  }

  let successfulDownloads = 0; 
  let delayAmount = fastMode ? 250 : 1500; 

  for (let i = 0; i < mediaEntries.length; i++) {
    if (window.stopPinterestScraper) {
      addLog("!!! DOWNLOAD PROCESS KILLED BY USER !!!");
      break; 
    }

    const item = mediaEntries[i];

    try {
      addLog(`Processing Pin ${i+1}...`);
      let response;
      let contentType = "Unknown";

      if (fastMode) {
        let mediumRes = item.fallback.replace(/\/\d+x\//, '/736x/');
        response = await fetch(mediumRes);
        contentType = response.headers.get('content-type') || "Unknown";
        
        if (!response.ok || (!contentType.includes('image') && !contentType.includes('video'))) {
             response = await fetch(item.fallback);
        }
      } else {
        response = await fetch(item.original);
        contentType = response.headers.get('content-type') || "Unknown";
        
        if (!response.ok || (!contentType.includes('image') && !contentType.includes('video'))) {
          if (maxQuality) {
            addLog(`   High-res unavailable. Max Quality is enforced, skipping pin.`);
            continue; 
          } else {
             let mediumRes = item.fallback.replace(/\/\d+x\//, '/736x/');
             response = await fetch(mediumRes);
             contentType = response.headers.get('content-type') || "Unknown";
             if (!response.ok || (!contentType.includes('image') && !contentType.includes('video'))) {
                 response = await fetch(item.fallback);
             }
          }
        }
      }

      if (response && response.ok) {
          successfulDownloads++;
          const blob = await response.blob();
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          
          await new Promise(resolve => {
            reader.onloadend = () => {
              let extension = 'jpg';
              if (item.type === 'video') extension = 'mp4';
              else if (item.fallback.includes('.webp')) extension = 'webp';
              else if (item.fallback.includes('.png')) extension = 'png';
              else if (item.fallback.includes('.gif')) extension = 'gif';

              let filename = `pinterest_pin_${successfulDownloads}.${extension}`;
              if (folderName !== "") filename = `${folderName}/${filename}`; 

              chrome.runtime.sendMessage({
                action: "saveFile",
                dataUrl: reader.result,
                filename: filename
              });
              resolve();
            };
          });
      }

    } catch (error) {
      addLog(`   CRASH on Pin ${i + 1}: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delayAmount)); 
  }
  
  addLog(`--- FINISHED! Successfully processed ${successfulDownloads} pins ---`);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; top:10%; left:10%; width:80%; height:80%; background:white; z-index:999999; padding:20px; box-shadow:0 0 20px rgba(0,0,0,0.5); border-radius:10px; display:flex; flex-direction:column;';
  
  const title = document.createElement('h2');
  title.innerText = 'Detective Logs: How did we do?';
  title.style.color = 'black';
  overlay.appendChild(title);

  const textarea = document.createElement('textarea');
  textarea.value = logHistory.join('\n');
  textarea.style.cssText = 'flex-grow:1; margin-bottom:10px; font-family:monospace; padding:10px; border:1px solid #ccc;';
  overlay.appendChild(textarea);

  const closeBtn = document.createElement('button');
  closeBtn.innerText = 'Close this window';
  closeBtn.style.cssText = 'padding:10px; background:#e60023; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;';
  closeBtn.onclick = () => overlay.remove();
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);

})();