document.getElementById('startBtn').addEventListener('click', async () => {
    try {
        const api = globalThis.browser || globalThis.chrome;
        const [tab] = await api.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url || (!tab.url.includes('pinterest.com') && !tab.url.includes('pinimg.com'))) {
            alert("Please navigate to a Pinterest board or pin page first!");
            return;
        }

        const keepGoing = document.getElementById('keepGoing').checked;
        const fastMode = document.getElementById('fastMode').checked;

        // Wake up the pre-loaded content script and send it your chosen toggles
        await api.tabs.sendMessage(tab.id, {
            action: "wake_up_sniper",
            keepGoing: keepGoing,
            fastMode: fastMode
        });

        // Close extension panel dropdown to uncover the Eagle Overlay menu
        window.close();

    } catch (error) {
        console.error("Popup Communication Error:", error);
        alert("Could not connect to page script. Try refreshing your Pinterest tab first!");
    }
});
