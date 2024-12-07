// app.js
let lastClipboardContent = '';

async function getClipboardContent() {
    try {
        const clipboardText = await Neutralino.clipboard.readText();
        if (clipboardText !== lastClipboardContent) {
            document.getElementById('clipboard-content').value = clipboardText;
            Neutralino.debug.log(clipboardText)
            lastClipboardContent = clipboardText;
        }
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
    }
}

// Refresh clipboard content every second
setInterval(getClipboardContent, 1000);
