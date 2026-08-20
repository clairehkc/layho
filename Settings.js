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

function getSettingsFocusableElements() {
    return Array.from(getSettingsModal().querySelectorAll(
        "button:not([disabled]), select:not([disabled]), input:not([disabled])"
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

function updateSavedSettingsValues() {
    savedSettingsValues = getSelectedSettingsValues();
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

function showSettings(trigger = document.activeElement) {
    const settingsModal = getSettingsModal();
    settingsTrigger = trigger;
    setBackgroundInert(true);
    settingsModal.style.display = 'flex';
    settingsModal.setAttribute("aria-hidden", "false");
    updateSavedSettingsValues();
    getSettingsFocusableElements()[0].focus();
}

function closeSettings(shouldRestoreFocus = true) {
    const settingsModal = getSettingsModal();
    const wasOpen = settingsModal.style.display === 'flex';
    settingsModal.style.display = 'none';
    settingsModal.setAttribute("aria-hidden", "true");
    setBackgroundInert(false);
    if (wasOpen && didSettingsChange()) {
        restartContinuousTranslation();
        document.getElementById("speechStatus").textContent = "Settings applied.";
    }
    updateSavedSettingsValues();

    if (wasOpen && shouldRestoreFocus && settingsTrigger?.isConnected && !settingsTrigger.hidden) {
        settingsTrigger.focus();
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

    speechRecognitionLanguageOptions.value = "zh-HK";
    targetLanguageOptions.value = "en-US";

    speechRecognitionLanguageOptions.addEventListener("change", (event) =>  {
        speechRecognitionLanguageDisplay.textContent = speechRecognitionLanguageOptions.selectedOptions[0].dataset.displayName;
    });
    targetLanguageOptions.addEventListener("change", (event) =>  {
        targetLanguageDisplay.textContent = targetLanguageOptions.selectedOptions[0].dataset.displayName;
    });

    speechRecognitionLanguageDisplay.textContent = speechRecognitionLanguageOptions.selectedOptions[0].dataset.displayName;
    targetLanguageDisplay.textContent = targetLanguageOptions.selectedOptions[0].dataset.displayName;
}

whenViewsReady(function () {
    // settings
    speechRecognitionLanguageOptions = document.getElementById("speechRecognitionLanguageOptions");
    targetLanguageOptions = document.getElementById("targetLanguageOptions");
    populateLanguageOptions();

    voiceOutputInput = document.getElementById("voiceOutputInput");
    voiceOutputInput.addEventListener("change", (event) =>  {
        if (voiceOutputInput.checked) {
            // disable conversation mode when voice output is checked
            conversationModeInput.checked = false;
        }
    });
    
    conversationModeInput = document.getElementById("conversationModeInput");
    conversationModeInput.addEventListener("change", (event) =>  {
        if (conversationModeInput.checked) {
            // disable voice output when conversation mode is checked
            voiceOutputInput.checked = false;
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

    const settingsCloseButton = document.getElementById("settingsCloseButton");
    settingsCloseButton.addEventListener("click", closeSettings);

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
