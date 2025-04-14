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

async function populateLanguageOptions() {
    const response = await fetch("LanguageOptions.json");
    const options = await response.json();
    const keys = Object.keys(options);

    for (const key of keys) {
        const recognitionOption = document.createElement('option');
        recognitionOption.value = key;
        recognitionOption.innerHTML = options[key].displayName;
        speechRecognitionLanguageOptions.appendChild(recognitionOption);

        const targetOption = document.createElement('option');
        targetOption.value = options[key].voiceName;
        targetOption.innerHTML = options[key].displayName;
        targetLanguageOptions.appendChild(targetOption);
    }

    speechRecognitionLanguageOptions.value = "zh-HK";
    targetLanguageOptions.value = "en-US-AvaMultilingualNeural";

    speechRecognitionLanguageOptions.addEventListener("change", (event) =>  {
        speechRecognitionLanguageDisplay.textContent = speechRecognitionLanguageOptions.selectedOptions[0].textContent;
    });
    targetLanguageOptions.addEventListener("change", (event) =>  {
        targetLanguageDisplay.textContent = targetLanguageOptions.selectedOptions[0].textContent;
    });

    speechRecognitionLanguageDisplay.textContent = speechRecognitionLanguageOptions.selectedOptions[0].textContent;
    targetLanguageDisplay.textContent = targetLanguageOptions.selectedOptions[0].textContent;
}

document.addEventListener("DOMContentLoaded", function () {
    // settings
    speechRecognitionLanguageOptions = document.getElementById("speechRecognitionLanguageOptions");
    targetLanguageOptions = document.getElementById("targetLanguageOptions");

    voiceOutputInput = document.getElementById("voiceOutputInput");
    conversationModeInput = document.getElementById("conversationModeInput");

    populateLanguageOptions();

    const settingsCloseButton = document.getElementById("settingsCloseButton");
    settingsCloseButton.addEventListener("click", closeSettings);
});
