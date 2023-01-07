const btnSelect = document.getElementById("btnSelect");
let isCSSInserted = false;

btnSelect.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log(isCSSInserted);

  if (!isCSSInserted) {
    isCSSInserted = true;
    chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["css/inject.css"],
    });
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: selectSection,
  });

  window.close();
});

// const removeCSS = async  () => {
//   try {
//     let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//     await chrome.scripting.removeCSS({
//       target: { tabId: tab.id },
//       files: ["css/inject.css"],})
//   } catch (err) {
//     console.error(`failed to remove CSS: ${err}`)
//   }
// }

function selectSection() {
  document.addEventListener("click", getSelectionData);

  const infoDivChildren = {
    Title: 0,
    Selectors: 1,
    Dimensions: 2,
    Help: 3,
    Hover: 4,
  };

  const infoDiv = document.createElement("div");
  infoDiv.id = "selection-reader-floating-button";
  Object.keys(infoDivChildren).forEach((key) => {
    const child = document.createElement("div");
    child.id = `${infoDiv.id}-${key.toLowerCase()}`;
    infoDiv.appendChild(child);
  });
  infoDiv.children[infoDivChildren.Title].innerHTML = "Select Section";
  infoDiv.children[infoDivChildren.Help].innerHTML =
    "<b>Left click</b> to select selector.<br/>More precise selection in next step.";
  infoDiv.children[infoDivChildren.Hover].innerHTML = "Go here for tips";

  document.body.appendChild(infoDiv);

  document.body.style.cursor = "copy";
  document.body.focus();

  let selectorIdx = 0;
  let selectors;

  function getSelectionData() {
    window.addEventListener("keypress", getKeyCode);
    infoDiv.addEventListener("click", confirmSelectorListener);

    selectors = document.body.querySelectorAll(":hover");
    selectorIdx = selectors.length - 1;

    setBackground(selectors[selectorIdx]);

    document.body.style.cursor = "";
    infoDiv.children[infoDivChildren.Title].innerHTML = "";
    infoDiv.children[infoDivChildren.Help].innerHTML =
      "Press <b>Z</b> and <b>X</b> to toggle selector.<br/>Press <b>C</b> or this button to confirm.<br/>Press <b>Q</b> to quit.";
    displayCurrentSelectorInfo();

    document.removeEventListener("click", getSelectionData);
  }

  function getKeyCode(event) {
    switch (event.code) {
      case "KeyZ":
        removeBackground(selectors[selectorIdx]);
        selectorIdx = (selectorIdx + selectors.length - 1) % selectors.length;
        setBackground(selectors[selectorIdx]);
        selectors[selectorIdx].scrollIntoView();
        displayCurrentSelectorInfo();
        break;
      case "KeyX":
        removeBackground(selectors[selectorIdx]);
        selectorIdx = (selectorIdx + 1) % selectors.length;
        setBackground(selectors[selectorIdx]);
        selectors[selectorIdx].scrollIntoView();
        displayCurrentSelectorInfo();
        break;
      case "KeyC":
        confirmSelector();
        break;
      case "KeyQ":
        quitSelectData();
        break;
    }
  }

  function confirmSelectorListener(event) {
    confirmSelector();
  }

  function displayCurrentSelectorInfo() {
    let tags = Array.from(selectors)
      .slice(0, selectorIdx)
      .reduce((acc, el) => acc + el.tagName.toLowerCase() + ".", "");
    tags += selectors[selectorIdx].tagName;
    const dimensions = `${selectors[selectorIdx].clientWidth} \u00D7 ${selectors[selectorIdx].clientHeight}`;
    infoDiv.children[infoDivChildren.Selectors].innerHTML = tags;
    infoDiv.children[infoDivChildren.Dimensions].innerHTML = dimensions;
  }

  let prevStyleBackground = "";
  let prevStyleOutline = "";
  let prevStyleOutlineOffset = "";

  function setBackground(el) {
    prevStyleBackground = el.style.background;
    prevStyleOutline = el.style.outline;
    prevStyleOutlineOffset = el.style.outlineOffset;
    el.style.background = "rgba(255,0,0,0.5)";
    el.style.outline = "4px dashed darkblue";
    el.style.outlineOffset = "-2px";
  }
  function removeBackground(el) {
    el.style.background = prevStyleBackground;
    el.style.outline = prevStyleOutline;
    el.style.outlineOffset = prevStyleOutlineOffset;
  }

  function confirmSelector() {
    setFocus(selectors[selectorIdx]);
    window.removeEventListener("keypress", getKeyCode);
    infoDiv.removeEventListener("click", confirmSelectorListener);
  }

  function quitSelectData() {
    removeBackground(selectors[selectorIdx]);
    window.removeEventListener("keypress", getKeyCode);
    infoDiv.removeEventListener("click", confirmSelectorListener);
    infoDiv.remove();
  }

  let prevStylesZIndex = [];
  const MAX_Z_INDEX = 2147483647;

  function setFocus(el) {
    document.body.style.overflow = "hidden";
    if (selectorIdx) {
      Array.from(selectors)
        .slice(0, selectorIdx)
        .forEach((el) => {
          prevStylesZIndex.push(el.style.zIndex);
          el.style.zIndex = MAX_Z_INDEX;
        });
    }

    console.log(prevStylesZIndex);
    el.style.cssText = `
      position: fixed;
      inset: 0;
      overflow-y: auto;
      z-index: ${MAX_Z_INDEX};
      margin: 0;
      padding: 1rem max(1rem, 17px) 30vh 1rem;
    `;
    if (!el.style.background) {
      el.style.background = "white";
    }
    el.focus();
  }
}
