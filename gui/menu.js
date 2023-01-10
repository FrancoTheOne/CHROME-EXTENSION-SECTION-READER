async function getActiveTabURL() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function onBtnSelect(tabId) {
  try {
    chrome.tabs.sendMessage(
      tabId,
      {
        type: "SECTION_READER_SELECT",
        value: tabId,
      },
      async (response) => {
        if (!response.isCSSInjected) {
          await chrome.scripting.insertCSS({
            target: { tabId: response.tabId },
            files: ["css/inject.css"],
          });
        }
        await chrome.scripting.executeScript({
          target: { tabId: response.tabId },
          function: getScriptInject,
        });
        window.close();
      }
    );
  } catch (err) {
    console.log("Section reader:", "onBtnSelect", err);
  }
}

function getScriptInject() {
  let infoDiv;
  const InfoType = {
    Title: 0,
    Selectors: 1,
    Dimensions: 2,
    Help: 3,
    Hover: 4,
  };

  function startCursorSelect() {
    initInfoDiv();
    updateInfoDiv(InfoType.Title, "Select Section");
    updateInfoDiv(
      InfoType.Help,
      `<b>Left click</b> to select selector.<br/>
      More precise selection in next step.<br/>
      Press <b>Q</b> to quit.`
    );
    updateInfoDiv(InfoType.Hover, "Go here for tips");

    document.body.classList.add("section-reader-cursor-select");
    document.addEventListener("click", onCursorSelectClick);
    document.addEventListener("keypress", onCursorSelectKeypress);

    document.body.focus();
  }

  function exitCursorSelect() {
    document.body.classList.remove("section-reader-cursor-select");
    document.removeEventListener("click", onCursorSelectClick);
    document.removeEventListener("keypress", onCursorSelectKeypress);
  }

  function initInfoDiv() {
    infoDiv = document.createElement("div");
    infoDiv.id = "sectionReaderFloatingButton";
    Object.keys(InfoType).forEach((key) => {
      const child = document.createElement("div");
      child.id = `${infoDiv.id}${key}`;
      infoDiv.appendChild(child);
    });
    document.body.appendChild(infoDiv);
  }

  function updateInfoDiv(infoType, innerHTML) {
    infoDiv.children[infoType].innerHTML = innerHTML;
  }

  let selectorIdx = 0;
  let selectors;

  function onCursorSelectClick() {
    exitCursorSelect();
    startSelectorToggle();
  }

  function onCursorSelectKeypress(event) {
    if (event.code === "KeyQ") {
      exitCursorSelect();
      exit();
    }
  }

  let highlightDiv;

  function startSelectorToggle() {
    updateInfoDiv(InfoType.Title, "");
    updateInfoDiv(
      InfoType.Help,
      `Press <b>Z</b> and <b>X</b> to toggle selector.<br/>
      Press <b>C</b> or this button to confirm.<br/>
      Press <b>Q</b> to quit.`
    );

    selectors = document.body.querySelectorAll(":hover");
    selectorIdx = selectors.length - 1;
    displayCurrentSelectorInfo();

    window.addEventListener("keypress", onSelectorToggleKeypress);
    infoDiv.addEventListener("click", onSelectorToggleInfoDivClick);

    initHighlightDiv();
    updateHighlightDiv();
  }

  function exitSelectorToggle() {
    window.removeEventListener("keypress", onSelectorToggleKeypress);
    infoDiv.removeEventListener("click", onSelectorToggleInfoDivClick);
    highlightDiv.remove();
  }

  function displayCurrentSelectorInfo() {
    let tags = selectorIdx - 4 > 0 ? "..." : "";
    tags += Array.from(selectors)
      .slice(Math.max(0, selectorIdx - 4), selectorIdx)
      .reduce((acc, el) => acc + el.tagName.toLowerCase() + ".", "");
    tags += selectors[selectorIdx].tagName;
    const dimensions = `${selectors[selectorIdx].clientWidth} \u00D7 ${selectors[selectorIdx].clientHeight}`;
    updateInfoDiv(InfoType.Selectors, tags);
    updateInfoDiv(InfoType.Dimensions, dimensions);
  }

  function selectorToggle(newIdx) {
    selectorIdx = newIdx;
    updateHighlightDiv();
    displayCurrentSelectorInfo();
  }

  function initHighlightDiv() {
    highlightDiv = document.createElement("div");
    highlightDiv.id = "sectionReaderHighlight";
    document.body.appendChild(highlightDiv);
  }

  function updateHighlightDiv() {
    let offsetTop = 0;
    let offsetLeft = 0;
    let curElement = selectors[selectorIdx];
    do {
      offsetTop += curElement.offsetTop ?? 0;
      offsetLeft += curElement.offsetLeft ?? 0;
      curElement = curElement.offsetParent;
    } while (curElement);

    highlightDiv.style.top = `${offsetTop}px`;
    highlightDiv.style.left = `${offsetLeft}px`;
    highlightDiv.style.width = `${selectors[selectorIdx].offsetWidth}px`;
    highlightDiv.style.height = `${selectors[selectorIdx].offsetHeight}px`;
  }

  function confirmSelector() {
    exitSelectorToggle();
    startFocusSection();
  }

  function onSelectorToggleKeypress(event) {
    switch (event.code) {
      case "KeyZ":
        selectorToggle((selectorIdx + selectors.length - 1) % selectors.length);
        break;
      case "KeyX":
        selectorToggle((selectorIdx + 1) % selectors.length);
        break;
      case "KeyC":
        confirmSelector();
        break;
      case "KeyQ":
        exitSelectorToggle();
        exit();
        break;
    }
  }

  function onSelectorToggleInfoDivClick(event) {
    confirmSelector();
  }

  let isFocusSectionBackgroundTransparent = false;
  let originalFocusSectionCssText;

  function startFocusSection() {
    document.body.classList.add("section-reader-overflow-hidden");
    if (selectorIdx) {
      Array.from(selectors)
        .slice(0, selectorIdx + 1)
        .forEach((el) => el.classList.add("section-reader-z-index-max"));
    }

    originalFocusSectionCssText = selectors[selectorIdx].style.cssText;
    selectors[selectorIdx].style.cssText = `
      position: fixed !important; inset: 0 !important;
      width: auto !important; height: auto !important;
      max-width: none !important; max-height: none !important;
      margin: 0 !important;
      padding: 16px 17px 30vh 16px !important;
      overflow-y: auto !important;
    `;

    if (!selectors[selectorIdx].style.background) {
      isFocusSectionBackgroundTransparent = true;
      selectors[selectorIdx].style.background = "white";
    }

    window.addEventListener("keypress", onFocusSelectionKeypress);

    infoDiv.classList.add("section-reader-floating-button-hide");

    selectors[selectorIdx].focus();
  }

  function exitFocusSelection() {
    document.body.classList.remove("section-reader-overflow-hidden");
    if (selectorIdx) {
      Array.from(selectors)
        .slice(0, selectorIdx + 1)
        .forEach((el) => el.classList.remove("section-reader-z-index-max"));
    }

    selectors[selectorIdx].style.cssText = originalFocusSectionCssText;
    if (isFocusSectionBackgroundTransparent) {
      selectors[selectorIdx].style.background = "";
    }

    window.removeEventListener("keypress", onFocusSelectionKeypress);
  }

  function onFocusSelectionKeypress(event) {
    switch (event.code) {
      case "KeyQ":
        exitFocusSelection();
        exit();
        break;
    }
  }

  function main() {
    if (window.isChromeExtensionSectionReaderScriptInjected !== true) {
      window.isChromeExtensionSectionReaderScriptInjected = true;
    } else {
      console.log("Section reader:", "Script injection rejected.");
      return true;
    }

    startCursorSelect();
  }

  function exit() {
    infoDiv.remove();
    window.isChromeExtensionSectionReaderScriptInjected = false;
  }

  main();
}

document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();
  const btnSelect = document.getElementById("btnSelect");
  btnSelect.addEventListener("click", () => onBtnSelect(activeTab.id));
});

// chrome.storage.sync.get(["testing"]).then((data) => {
//   if (data.testing) {
//     alert(data.testing);
//   } else {
//     alert("none");
//     chrome.storage.sync.set({ testing: "hehe" });
//   }
// });
