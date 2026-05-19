document.getElementById('startBtn').addEventListener('click', async () => {
    try {
        const api = globalThis.browser || globalThis.chrome;
        const [tab] = await api.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes('pinterest.com') && !tab.url.includes('pinimg.com')) {
            alert("Please navigate to a Pinterest page first!");
            return;
        }

        const keepGoing = document.getElementById('keepGoing').checked;
        const fastMode = document.getElementById('fastMode').checked;

        // Inject the toggles into the page so the overlay menu can read them
        await api.scripting.executeScript({
            target: { tabId: tab.id },
            func: (kg, fm) => {
                window.sniperKeepGoing = kg;
                window.sniperFastMode = fm;
            },
            args: [keepGoing, fastMode]
        });

        // Inject your custom Eagle Menu overlay
        await api.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scraper.js']
        });

        // Close the extension dropdown to reveal the overlay
        window.close();

    } catch (error) {
        console.error("Popup Error:", error);
        alert("Something went wrong. Refresh the page and try again.");
    }
});