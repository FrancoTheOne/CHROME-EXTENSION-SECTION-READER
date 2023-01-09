(() => {
  let isCSSInjected = false;

  function cssInit() {
    if (isCSSInjected) {
      return true;
    } else {
      isCSSInjected = true;
      return false;
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, senderResponse) => {
    const { type, value } = message;

    if (type === "SECTION_READER_SELECT") {
      senderResponse({
        isCSSInjected: cssInit(),
        tabId: value,
      });
    }
    return true;
  });
})();
