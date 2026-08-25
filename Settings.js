const settingsCookieName = "layho_settings";
const settingsCookieMaxAgeSeconds = 31536000;
const defaultSpeechRecognitionLanguage = "zh-HK";
const defaultTargetLanguage = "en-US";

let speechRecognitionLanguageOptions;
let targetLanguageOptions;
let voiceOutputInput;
let conversationModeInput;

let settingsList;
let savedSettingsValues;
let settingsTrigger;

function getSettingsModal() {
    return document.getElementById("settingsModal");
}

const settingsHash = "settings";

function isSettingsRoute() {
    return window.location.hash.replace(/^#/, "") === settingsHash;
}

function setSettingsRoute(open) {
    if (open) {
        if (!isSettingsRoute()) {
            history.pushState({ layho: "settings" }, "", `#${settingsHash}`);
        }
        return;
    }

    if (isSettingsRoute()) {
        history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
}

function getSettingsFocusableElements() {
    return Array.from(getSettingsModal().querySelectorAll(
        "button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href]"
    ));
}

function getSelectedSettingsValues() {
    return [
        speechRecognitionLanguageOptions.value,
        targetLanguageOptions.value,
        voiceOutputInput.checked,
        conversationModeInput.checked
    ];
}

function getPersistedSettings() {
    const raw = getCookie(settingsCookieName);
    if (!raw) return undefined;
    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn("Unable to read saved settings.", error);
        return undefined;
    }
}

function persistSettings() {
    setCookie(settingsCookieName, JSON.stringify({
        speechRecognitionLanguage: speechRecognitionLanguageOptions.value,
        targetLanguage: targetLanguageOptions.value,
        voiceOutput: voiceOutputInput.checked,
        conversationMode: conversationModeInput.checked
    }), settingsCookieMaxAgeSeconds);
}

function setSelectValue(select, value, fallback) {
    if (value) {
        select.value = value;
        if (select.value === value) return;
    }
    select.value = fallback;
}

function applyPersistedSettings() {
    const saved = getPersistedSettings() || {};
    setSelectValue(
        speechRecognitionLanguageOptions,
        saved.speechRecognitionLanguage,
        defaultSpeechRecognitionLanguage
    );
    setSelectValue(
        targetLanguageOptions,
        saved.targetLanguage,
        defaultTargetLanguage
    );
    voiceOutputInput.checked = Boolean(saved.voiceOutput);
    conversationModeInput.checked = Boolean(saved.conversationMode);
    if (voiceOutputInput.checked && conversationModeInput.checked) {
        conversationModeInput.checked = false;
    }
}

function snapshotSettingsValues() {
    savedSettingsValues = getSelectedSettingsValues();
}

function updateSavedSettingsValues() {
    snapshotSettingsValues();
    persistSettings();
}

function syncLanguageDisplaysFromSettings() {
    const fromOption = speechRecognitionLanguageOptions.selectedOptions[0];
    const toOption = targetLanguageOptions.selectedOptions[0];
    if (!fromOption || !toOption) return;
    const fromDisplay = document.getElementById("speechRecognitionLanguageDisplay");
    const toDisplay = document.getElementById("targetLanguageDisplay");
    if (fromDisplay) fromDisplay.textContent = fromOption.dataset.displayName;
    if (toDisplay) toDisplay.textContent = toOption.dataset.displayName;
}

function restoreSettingsValues() {
    if (!savedSettingsValues) return;
    speechRecognitionLanguageOptions.value = savedSettingsValues[0];
    targetLanguageOptions.value = savedSettingsValues[1];
    voiceOutputInput.checked = savedSettingsValues[2];
    conversationModeInput.checked = savedSettingsValues[3];
    syncLanguageDisplaysFromSettings();
}

function didSettingsChange() {
    const selectedValues = getSelectedSettingsValues();
    
    let didChange = false;
    for (i=0; i<selectedValues.length; i++) {
        if (selectedValues[i] !== savedSettingsValues[i]) {
            didChange = true;
            break;
        }
    }

    return didChange;
}

function getSettingsContainer() {
    return document.getElementById("settingsContainer");
}

function updateSettingsScrollHint() {
    const settingsModal = getSettingsModal();
    const container = getSettingsContainer();
    if (!container || settingsModal.style.display !== "flex") {
        settingsModal.classList.remove("is-overflowing", "can-scroll-down", "can-scroll-up");
        return;
    }

    const maxScroll = container.scrollHeight - container.clientHeight;
    const canScroll = maxScroll > 1;
    const atTop = container.scrollTop <= 1;
    const atBottom = container.scrollTop >= maxScroll - 1;

    settingsModal.classList.toggle("is-overflowing", canScroll);
    settingsModal.classList.toggle("can-scroll-down", canScroll && !atBottom);
    settingsModal.classList.toggle("can-scroll-up", canScroll && !atTop);
}

function showSettings(trigger = document.activeElement) {
    const settingsModal = getSettingsModal();
    const alreadyOpen = settingsModal.style.display === "flex";
    if (!alreadyOpen) {
        settingsTrigger = trigger;
        setBackgroundInert(true);
        settingsModal.style.display = "flex";
        settingsModal.setAttribute("aria-hidden", "false");
        snapshotSettingsValues();
        getSettingsContainer().scrollTop = 0;
        getSettingsFocusableElements()[0].focus();
        requestAnimationFrame(() => {
            requestAnimationFrame(updateSettingsScrollHint);
        });
    }
    setSettingsRoute(true);
}

function hideSettings(shouldRestoreFocus = true) {
    const settingsModal = getSettingsModal();
    const wasOpen = settingsModal.style.display === "flex";
    settingsModal.style.display = 'none';
    settingsModal.setAttribute("aria-hidden", "true");
    settingsModal.classList.remove("is-overflowing", "can-scroll-down", "can-scroll-up");
    setBackgroundInert(false);
    setSettingsRoute(false);

    if (wasOpen && shouldRestoreFocus && settingsTrigger?.isConnected && !settingsTrigger.hidden) {
        settingsTrigger.focus();
    }

    return wasOpen;
}

function closeSettings(shouldRestoreFocus = true) {
    const wasOpen = getSettingsModal().style.display === "flex";
    if (wasOpen) {
        restoreSettingsValues();
    }
    hideSettings(shouldRestoreFocus);
}

function submitSettings() {
    const didChange = didSettingsChange();
    updateSavedSettingsValues();
    hideSettings();
    if (didChange) {
        restartContinuousTranslation();
        document.getElementById("speechStatus").textContent = "Settings applied.";
    }
}

function createNewLanguageOption(options, key) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = options[key].displayName;
    option.dataset.displayName = options[key].displayName;
    option.dataset.voiceName = options[key].voiceName;
    return option;
}

async function populateLanguageOptions() {
    const response = await fetch("LanguageOptions.json");
    const options = await response.json();
    const keys = Object.keys(options);

    for (const key of keys) {
        const recognitionOption = createNewLanguageOption(options, key);
        speechRecognitionLanguageOptions.appendChild(recognitionOption);

        const targetOption = createNewLanguageOption(options, key);
        targetLanguageOptions.appendChild(targetOption);
    }

    applyPersistedSettings();
    updateSavedSettingsValues();

    speechRecognitionLanguageOptions.addEventListener("change", syncLanguageDisplaysFromSettings);
    targetLanguageOptions.addEventListener("change", syncLanguageDisplaysFromSettings);
    syncLanguageDisplaysFromSettings();
}

whenViewsReady(function () {
    // settings
    speechRecognitionLanguageOptions = document.getElementById("speechRecognitionLanguageOptions");
    targetLanguageOptions = document.getElementById("targetLanguageOptions");
    voiceOutputInput = document.getElementById("voiceOutputInput");
    conversationModeInput = document.getElementById("conversationModeInput");
    populateLanguageOptions();

    voiceOutputInput.addEventListener("change", () => {
        if (voiceOutputInput.checked && conversationModeInput.checked) {
            conversationModeInput.checked = false;
            document.getElementById("speechStatus").textContent =
                "Voice output on. Conversation mode turned off.";
        }
    });

    conversationModeInput.addEventListener("change", () => {
        if (conversationModeInput.checked && voiceOutputInput.checked) {
            voiceOutputInput.checked = false;
            document.getElementById("speechStatus").textContent =
                "Conversation mode on. Voice output turned off.";
        }
    });

    [speechRecognitionLanguageOptions, targetLanguageOptions].forEach((select) => {
        select.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                if (typeof select.showPicker === "function") {
                    try {
                        select.showPicker();
                        return;
                    } catch (error) {
                        console.warn("Unable to open language picker.", error);
                    }
                }

                select.selectedIndex = (select.selectedIndex + 1) % select.options.length;
                select.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });
    });

    [voiceOutputInput, conversationModeInput].forEach((input) => {
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                input.click();
            }
        });
    });

    document.getElementById("settingsForm").addEventListener("submit", function (event) {
        event.preventDefault();
        submitSettings();
    });

    const settingsCloseButton = document.getElementById("settingsCloseButton");
    settingsCloseButton.addEventListener("click", closeSettings);

    const settingsContainer = getSettingsContainer();
    settingsContainer.addEventListener("scroll", updateSettingsScrollHint, { passive: true });
    window.addEventListener("resize", updateSettingsScrollHint);
    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", updateSettingsScrollHint);
    }
    if (typeof ResizeObserver === "function") {
        new ResizeObserver(updateSettingsScrollHint).observe(settingsContainer);
    }

    window.addEventListener("hashchange", function () {
        if (isSettingsRoute()) {
            showSettings(document.getElementById("settingsButton"));
            return;
        }
        if (getSettingsModal().style.display === "flex") {
            closeSettings();
        }
    });

    if (isSettingsRoute()) {
        showSettings(document.getElementById("settingsButton"));
    }

    document.addEventListener("keydown", (event) => {
        const settingsModal = getSettingsModal();
        if (settingsModal.style.display !== "flex") {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            closeSettings();
            return;
        }

        if (event.key === "Tab") {
            const focusableElements = getSettingsFocusableElements();
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    });
});
