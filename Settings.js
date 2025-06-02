let speechRecognitionLanguageOptions;
let targetLanguageOptions;
let voiceOutputInput;
let conversationModeInput;

let settingsList;
let savedSettingsValues;

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

function showSettings() {
    document.getElementById("settingsModal").style.display = 'flex';
    updateSavedSettingsValues();
}

function closeSettings() {
    document.getElementById("settingsModal").style.display = 'none';
    if (didSettingsChange()) {
        restartContinuousTranslation();
    }
    updateSavedSettingsValues();
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

document.addEventListener("DOMContentLoaded", function () {
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

    const settingsCloseButton = document.getElementById("settingsCloseButton");
    settingsCloseButton.addEventListener("click", closeSettings);
});
