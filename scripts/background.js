// open "hello" page on (first) install
chrome.runtime.onInstalled.addListener(function (object) {
    const helloUrl = chrome.runtime.getURL("hello/index.html")
    if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.tabs.create({ url: helloUrl })
    }
})