let speechRecognitionLanguageOptions;
let targetLanguageOptions;
let voiceOutputInput;
let conversationModeInput;

let settingsList;
let savedSettingsValues;

let settingsSaveButton;

function updatedSavedSettingsValues() {
    savedSettingsValues = [
        speechRecognitionLanguageOptions.value,
        targetLanguageOptions.value,
        voiceOutputInput.checked,
        conversationModeInput.checked
    ];
}

function showSettings() {
    document.getElementById("settingsModal").style.display = 'flex';
    updatedSavedSettingsValues();
}

function closeSettings() {
    document.getElementById("settingsModal").style.display = 'none';
}

function checkShouldshowSettingsSaveButton() {
    const selectedValues = [
        speechRecognitionLanguageOptions.value,
        targetLanguageOptions.value,
        voiceOutputInput.checked,
        conversationModeInput.checked
    ];
    
    let shouldShow = false;
    for (i=0; i<selectedValues.length; i++) {
        if (selectedValues[i] !== savedSettingsValues[i]) {
            shouldShow = true;
            break;
        }
    }

    showSettingsSaveButton(shouldShow); 
}

// restarts continuous translation with updated settings
function showSettingsSaveButton(shouldShow) {
    if (shouldShow) {
        settingsSaveButton.classList.remove('disabled');
    } else {
        settingsSaveButton.classList.add('disabled'); 
    }
}

function onSettingsSaveButtonClick() {
    updatedSavedSettingsValues();
    checkShouldshowSettingsSaveButton();
    restartContinuousTranslation();
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

    settingsList = [speechRecognitionLanguageOptions, targetLanguageOptions, voiceOutputInput, conversationModeInput];
    settingsList.forEach(setting => {
        setting.addEventListener("change", (event) =>  {
            checkShouldshowSettingsSaveButton();
        });
    })

    populateLanguageOptions();
    
    settingsSaveButton = document.getElementById("settingsSaveButton");
    settingsSaveButton.addEventListener("click", onSettingsSaveButtonClick);

    const settingsCloseButton = document.getElementById("settingsCloseButton");
    settingsCloseButton.addEventListener("click", closeSettings);
});
