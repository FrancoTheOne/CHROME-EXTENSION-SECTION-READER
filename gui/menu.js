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

    setBackground(selectors[selectorIdx]);
  }

  function exitSelectorToggle() {
    window.removeEventListener("keypress", onSelectorToggleKeypress);
    infoDiv.removeEventListener("click", onSelectorToggleInfoDivClick);
    removeBackground(selectors[selectorIdx]);
  }

  function displayCurrentSelectorInfo() {
    let tags = Array.from(selectors)
      .slice(0, selectorIdx)
      .reduce((acc, el) => acc + el.tagName.toLowerCase() + ".", "");
    tags += selectors[selectorIdx].tagName;
    const dimensions = `${selectors[selectorIdx].clientWidth} \u00D7 ${selectors[selectorIdx].clientHeight}`;
    updateInfoDiv(InfoType.Selectors, tags);
    updateInfoDiv(InfoType.Dimensions, dimensions);
  }

  function selectorToggle(newIdx) {
    removeBackground(selectors[selectorIdx]);
    selectorIdx = newIdx;
    setBackground(selectors[newIdx]);
    selectors[newIdx].scrollIntoView();
    displayCurrentSelectorInfo();
  }

  function setBackground(el) {
    el.classList.add("section-reader-highlight");
  }

  function removeBackground(el) {
    el.classList.remove("section-reader-highlight");
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

  function startFocusSection() {
    document.body.classList.add("section-reader-overflow-hidden");
    if (selectorIdx) {
      Array.from(selectors)
        .slice(0, selectorIdx)
        .forEach((el) => el.classList.add("section-reader-z-index-max"));
    }

    selectors[selectorIdx].classList.add("section-reader-focus-section");
    if (!selectors[selectorIdx].style.background) {
      isFocusSectionBackgroundTransparent = true;
      selectors[selectorIdx].style.background = "white";
    }

    selectors[selectorIdx].focus();
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
