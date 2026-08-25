// extended from https://github.com/Azure-Samples/cognitive-services-speech-sdk/tree/master/samples/js/browser

const region = "westus";

let apiKey;
let SpeechSDK;

let speechRecognitionLanguage;
let targetLanguage;

let activeTranslationRecognizer;
let translationRecognizer1;
let translationRecognizer2;
let conversationLanguageRecognizer;
let expectedConversationLanguage;
let pendingConversationLanguage;
let pendingConversationLanguageCount = 0;
let soundContext = undefined;

let startButton, stopButton;
let isListening = false;

try {
    let AudioContext = window.AudioContext // our preferred impl
        || window.webkitAudioContext       // fallback, mostly when on Safari
        || false;                          // could not find.

    if (AudioContext) {
        soundContext = new AudioContext();
    } else {
        alert("Audio context not supported");
    }
} catch (e) {
    window.console.log("no sound context found, no audio output. " + e);
}

const CONVERSATION_LANGUAGE_CONFIRMATIONS = 2;
const MIN_TRANSLATION_FONT_SIZE_PX = 10;
const TRANSLATION_TEXT_MARGIN_PX = 48;

function resetUiForScenarioStart() {
    detected.textContent = "";
    translated.textContent = "";
    fitTranslationText();
}

function translationTextOverflows(container, content) {
    return content.scrollHeight > container.clientHeight - TRANSLATION_TEXT_MARGIN_PX
        || content.scrollWidth > container.clientWidth - TRANSLATION_TEXT_MARGIN_PX;
}

function fitTranslationText() {
    const container = document.getElementById("translationDisplayContainer");
    const resultsContainer = document.getElementById("resultsContainer");
    if (!container || !resultsContainer) return;

    resultsContainer.style.removeProperty("--translation-text-size");

    const textElement = document.querySelector(".translationTextContainer");
    if (!textElement) return;

    const availableHeight = container.clientHeight - TRANSLATION_TEXT_MARGIN_PX;
    const availableWidth = container.clientWidth - TRANSLATION_TEXT_MARGIN_PX;
    if (availableHeight <= 0 || availableWidth <= 0) return;

    const cssDefaultSize = parseFloat(getComputedStyle(textElement).fontSize);
    const maxFontSize = Math.max(cssDefaultSize, availableHeight, availableWidth);

    let low = MIN_TRANSLATION_FONT_SIZE_PX;
    let high = maxFontSize;
    let bestFit = maxFontSize;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        resultsContainer.style.setProperty("--translation-text-size", `${mid}px`);
        if (translationTextOverflows(container, resultsContainer)) {
            high = mid - 1;
        } else {
            bestFit = mid;
            low = mid + 1;
        }
    }

    resultsContainer.style.setProperty("--translation-text-size", `${bestFit}px`);
}

let fitTranslationTextFrame;
function scheduleFitTranslationText() {
    cancelAnimationFrame(fitTranslationTextFrame);
    fitTranslationTextFrame = requestAnimationFrame(fitTranslationText);
}

whenViewsReady(function () {
    startButton = document.getElementById("startButton");
    stopButton = document.getElementById("stopButton");

    detected = document.getElementById("detected");
    translated = document.getElementById("translated");

    const translationDisplayContainer = document.getElementById("translationDisplayContainer");
    new ResizeObserver(scheduleFitTranslationText).observe(translationDisplayContainer);
    window.addEventListener("resize", scheduleFitTranslationText);

    const switchLanguageButton = document.getElementById("switchLanguageButton");

    startButton.addEventListener("click", function () {
        startContinuousTranslation();
    });
    stopButton.addEventListener("click", function() {
        stopContinuousTranslation();
    });

    switchLanguageButton.addEventListener("click", function() {
        switchActiveLanguages();
        if (isListening) {
            stopContinuousTranslation(true);
        }
    });

    Initialize(async function (speechSdk) {
        SpeechSDK = speechSdk;
    });

    const translateViewSettingsButton = document.getElementById("translateViewSettingsButton");
    translateViewSettingsButton.addEventListener("click", function () {
        showSettings();
    });

    const homeButton = document.getElementById("homeButton");
    homeButton.addEventListener("click", function () {
        closeSettings(false);
        if (isListening) {
            stopContinuousTranslation();
        }
        document.getElementById("translationContainer").style.display = 'none';
        document.getElementById("introContainer").style.display = 'flex';
        document.getElementById("startAppButton").focus();
        document.getElementById("speechStatus").textContent = "Home view.";
    });

    document.addEventListener("keydown", (event) => {
        const isEditableTarget = event.target.closest("input, select, textarea, [contenteditable='true']");
        const isTranslationViewOpen = document.getElementById("translationContainer").style.display === "flex";
        const isSettingsOpen = document.getElementById("settingsModal").style.display === "flex";
        if (event.key === "Escape" && isTranslationViewOpen && !event.defaultPrevented) {
            event.preventDefault();
            homeButton.click();
            return;
        }
        if (
            event.key.toLowerCase() === "s"
            && !event.ctrlKey
            && !event.metaKey
            && !event.altKey
            && !isEditableTarget
            && isTranslationViewOpen
            && !isSettingsOpen
        ) {
            event.preventDefault();
            if (!isListening) {
                onStartKeyPress();
            } else {
                onStopKeyPress();
            }
        }
    });
});

function Initialize(onComplete) {
    if (!!window.SpeechSDK) {
        onComplete(window.SpeechSDK);
    }
}

function getAudioConfig() {
    return SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
}

function getSpeechConfig(sdkConfigType, newSpeechRecognitionLanguage = undefined, newTargetLanguage = undefined) {
    let speechConfig;
    if (!apiKey) {
        console.error('no apiKey');
        return undefined;
    } else {
        speechConfig = sdkConfigType.fromSubscription(apiKey, region);
    }

    // Defines the language(s) that speech should be translated to.
    // Multiple languages can be specified for text translation and will be returned in a map.
    if (sdkConfigType == SpeechSDK.SpeechTranslationConfig) {
        const selectedTargetLanguage = targetLanguageOptions.value;
        targetLanguage = newTargetLanguage || selectedTargetLanguage;
        console.log("target language:", targetLanguage);

        // only specify the language code that precedes the locale dash (-) separator
        const targetLanguageCode = targetLanguage.match(/.*(?=-)/)[0];

        speechConfig.addTargetLanguage(targetLanguageCode);
        console.log("target language code:", targetLanguageCode);
        
        // If voice output is requested, set the target voice.
        // If multiple text translations were requested, only the first one added will have audio synthesised for it.
        if (voiceOutputInput.checked) {
            const translationVoice = targetLanguageOptions.selectedOptions[0].dataset.voiceName;
            console.log("translationVoice", translationVoice);
            speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_TranslationVoice, translationVoice);
        }
    }

    const selectedSpeechRecognitionLanguage = speechRecognitionLanguageOptions.value;
    speechConfig.speechRecognitionLanguage = newSpeechRecognitionLanguage || selectedSpeechRecognitionLanguage;
    speechRecognitionLanguage = speechConfig.speechRecognitionLanguage;
    console.log("recognition language:", speechRecognitionLanguage);
    return speechConfig;
}

function onRecognizing(sender, recognitionEventArgs) {
    const result = recognitionEventArgs.result;
    if (!result.text || !shouldPresentRecognizer(sender)) return;
    presentFromRecognizer(sender);
    detected.textContent = detected.textContent.replace(/(.*)(^|[\r\n]+).*\[\.\.\.\][\r\n]+/, '$1$2')
        + `${result.text} [...]\r\n`;
    scheduleFitTranslationText();
}

function onRecognized(sender, recognitionEventArgs) {
    if (!shouldPresentRecognizer(sender)) return;
    const result = recognitionEventArgs.result;
    const hasSpeech = result.text && (
        result.reason === SpeechSDK.ResultReason.RecognizedSpeech
        || result.reason === SpeechSDK.ResultReason.TranslatedSpeech
    );
    if (hasSpeech) {
        presentFromRecognizer(sender);
    } else if (sender !== activeTranslationRecognizer) {
        return;
    }
    onRecognizedResult(result);
}

function onRecognizedResult(result) {
    detected.scrollTop = detected.scrollHeight;

    if (result.text) detected.textContent = detected.textContent.replace(/(.*)(^|[\r\n]+).*\[\.\.\.\][\r\n]+/, '$1$2')
        + `${result.text} [...]\r\n`;

    switch (result.reason) {
        case SpeechSDK.ResultReason.NoMatch:
            const noMatchDetail = SpeechSDK.NoMatchDetails.fromResult(result);
            break;
        case SpeechSDK.ResultReason.Canceled:
            const cancelDetails = SpeechSDK.CancellationDetails.fromResult(result);
            break;
        case SpeechSDK.ResultReason.RecognizedSpeech:
        case SpeechSDK.ResultReason.TranslatedSpeech:
            if (result.text) {
                detected.textContent = `${result.text}\r\n`;
            }

            if (result.translations) {
                const resultJson = JSON.parse(result.json);
                resultJson['Translation']['Translations'].forEach(
                    function (translation) {
                    translated.textContent = `${translation.DisplayText}\r\n`;
                });
            }
            break;
    }

    scheduleFitTranslationText();
}

function setStartStopButtonsListening(listening) {
    startButton.hidden = listening;
    stopButton.hidden = !listening;
    const nextButton = listening ? stopButton : startButton;
    if (document.activeElement === startButton || document.activeElement === stopButton) {
        nextButton.focus();
    }
}

function onSessionStarted(sender, sessionEventArgs) {
    setStartStopButtonsListening(true);
    document.getElementById("speechStatus").textContent = "Listening for speech.";
}

function onSessionStopped(sender, sessionEventArgs) {
    setStartStopButtonsListening(false);
    document.getElementById("speechStatus").textContent = "Speech recognition stopped.";
}

function onCanceled (sender, cancellationEventArgs) {
    window.console.log(cancellationEventArgs);

    if (cancellationEventArgs.reason === SpeechSDK.CancellationReason.Error) {
        console.error("cancel due to error", cancellationEventArgs.errorDetails);
        document.getElementById("speechStatus").textContent = `Speech recognition error: ${cancellationEventArgs.errorDetails}`;
    }
}

function applyCommonConfigurationTo(recognizer) {
    // The 'recognizing' event signals that an intermediate recognition result is received.
    // Intermediate results arrive while audio is being processed and represent the current "best guess" about
    // what's been spoken so far.
    recognizer.recognizing = onRecognizing;

    // The 'recognized' event signals that a finalized recognition result has been received. These results are
    // formed across complete utterance audio (with either silence or eof at the end) and will include
    // punctuation, capitalization, and potentially other extra details.
    // 
    // * In the case of continuous scenarios, these final results will be generated after each segment of audio
    //   with sufficient silence at the end.
    // * In the case of intent scenarios, only these final results will contain intent JSON data.
    // * Single-shot scenarios can also use a continuation on recognizeOnceAsync calls to handle this without
    //   event registration.
    recognizer.recognized = onRecognized;

    // The 'canceled' event signals that the service has stopped processing speech.
    // https://docs.microsoft.com/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognitioncanceledeventargs?view=azure-node-latest
    // This can happen for two broad classes of reasons:
    // 1. An error was encountered.
    //    In this case, the .errorDetails property will contain a textual representation of the error.
    // 2. No additional audio is available.
    //    This is caused by the input stream being closed or reaching the end of an audio file.
    recognizer.canceled = onCanceled;

    // The 'sessionStarted' event signals that audio has begun flowing and an interaction with the service has
    // started.
    recognizer.sessionStarted = onSessionStarted;

    // The 'sessionStopped' event signals that the current interaction with the speech service has ended and
    // audio has stopped flowing.
    recognizer.sessionStopped = onSessionStopped;
}

function doContinuousTranslation(newSpeechRecognitionLanguage = undefined, newTargetLanguage = undefined) {
    console.log("doContinuousTranslation", newSpeechRecognitionLanguage, newTargetLanguage);
    if (!apiKey) {
        console.error('no apiKey');
        return undefined;
    }

    isListening = true;
    resetUiForScenarioStart();

    const audioConfig = getAudioConfig();
    const speechConfig = getSpeechConfig(SpeechSDK.SpeechTranslationConfig, newSpeechRecognitionLanguage, newTargetLanguage);
    if (!(audioConfig && speechConfig)) return;

    // Create the TranslationRecognizer and set up common event handlers and PhraseListGrammar data.
    const newTranslationRecognizer = new SpeechSDK.TranslationRecognizer(speechConfig, audioConfig);
    applyCommonConfigurationTo(newTranslationRecognizer);
    console.log("speechConfig", speechConfig);

    // Additive in TranslationRecognizer, the 'synthesizing' event signals that a payload chunk of synthesized
    // text-to-speech data is available for playback.
    // If the event result contains valid audio, it's reason will be ResultReason.SynthesizingAudio
    // Once a complete phrase has been synthesized, the event will be called with
    // ResultReason.SynthesizingAudioComplete and a 0-byte audio payload.
    newTranslationRecognizer.synthesizing = function (s, e) {
        const audioSize = e.result.audio === undefined ? 0 : e.result.audio.byteLength;

        if (e.result.audio && soundContext) {
            const source = soundContext.createBufferSource();
            soundContext.decodeAudioData(e.result.audio, function (newBuffer) {
                source.buffer = newBuffer;
                source.connect(soundContext.destination);
                source.start(0);
            });
        }
    };

    // Start the continuous recognition/translation operation.
    newTranslationRecognizer.startContinuousRecognitionAsync();
    newTranslationRecognizer.layhoSpeechLanguage = speechConfig.speechRecognitionLanguage;
    newTranslationRecognizer.layhoTargetLanguage = targetLanguage;
    return newTranslationRecognizer;
}

function updateLanguageDisplays(fromLocale, toLocale) {
    const fromOption = speechRecognitionLanguageOptions.querySelector(`option[value="${fromLocale}"]`);
    const toOption = targetLanguageOptions.querySelector(`option[value="${toLocale}"]`);
    document.getElementById("speechRecognitionLanguageDisplay").textContent =
        fromOption?.dataset.displayName || fromLocale;
    document.getElementById("targetLanguageDisplay").textContent =
        toOption?.dataset.displayName || toLocale;
}

function languagesMatch(detectedLanguage, recognizerLocale) {
    if (!detectedLanguage || !recognizerLocale) return false;
    return detectedLanguage.toLowerCase() === recognizerLocale.toLowerCase()
        || detectedLanguage.toLowerCase().startsWith(`${recognizerLocale.toLowerCase()}-`)
        || recognizerLocale.toLowerCase().startsWith(`${detectedLanguage.toLowerCase()}-`);
}

function findRecognizerForLanguage(detectedLanguage) {
    const recognizers = [translationRecognizer1, translationRecognizer2].filter(Boolean);
    const exactMatch = recognizers.find((recognizer) =>
        languagesMatch(detectedLanguage, recognizer.layhoSpeechLanguage)
    );
    if (exactMatch) return exactMatch;

    const primary = detectedLanguage.split("-")[0].toLowerCase();
    const primaryMatches = recognizers.filter((recognizer) =>
        recognizer.layhoSpeechLanguage?.split("-")[0].toLowerCase() === primary
    );
    return primaryMatches.length === 1 ? primaryMatches[0] : undefined;
}

function shouldPresentRecognizer(recognizer) {
    if (!conversationModeInput.checked || !translationRecognizer2) {
        return recognizer === activeTranslationRecognizer;
    }
    if (expectedConversationLanguage) {
        return languagesMatch(expectedConversationLanguage, recognizer.layhoSpeechLanguage);
    }
    return recognizer === activeTranslationRecognizer;
}

function presentFromRecognizer(recognizer) {
    if (!recognizer || recognizer === activeTranslationRecognizer) return;
    activeTranslationRecognizer = recognizer;
    speechRecognitionLanguage = recognizer.layhoSpeechLanguage;
    updateLanguageDisplays(recognizer.layhoSpeechLanguage, recognizer.layhoTargetLanguage);
    resetUiForScenarioStart();
}

function getDetectedLanguage(result) {
    if (SpeechSDK.AutoDetectSourceLanguageResult) {
        try {
            const language = SpeechSDK.AutoDetectSourceLanguageResult.fromResult(result).language;
            if (language && language !== "Unknown") return language;
        } catch (error) {
            console.warn("Unable to read auto-detected language.", error);
        }
    }
    return result.language || result.privLanguage;
}

function resetConversationLanguageDetection(language) {
    expectedConversationLanguage = language;
    pendingConversationLanguage = undefined;
    pendingConversationLanguageCount = 0;
}

function applyDetectedConversationLanguage(detectedLanguage, isFinal) {
    const nextRecognizer = findRecognizerForLanguage(detectedLanguage);
    if (!nextRecognizer) return;

    const locale = nextRecognizer.layhoSpeechLanguage;
    if (locale === expectedConversationLanguage) {
        pendingConversationLanguage = undefined;
        pendingConversationLanguageCount = 0;
        return;
    }

    if (isFinal || (locale === pendingConversationLanguage && pendingConversationLanguageCount + 1 >= CONVERSATION_LANGUAGE_CONFIRMATIONS)) {
        expectedConversationLanguage = locale;
        pendingConversationLanguage = undefined;
        pendingConversationLanguageCount = 0;
        console.log("conversation mode expecting", locale);
        return;
    }

    if (locale === pendingConversationLanguage) {
        pendingConversationLanguageCount += 1;
    } else {
        pendingConversationLanguage = locale;
        pendingConversationLanguageCount = 1;
    }
}

function startConversationMode(language1, language2) {
    // continuous language recognition and automatic switching
    const speechRecognitionConfig = SpeechSDK.SpeechConfig.fromEndpoint(new URL(`wss://${region}.stt.speech.microsoft.com/speech/universal/v2`), apiKey);
    speechRecognitionConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode, "Continuous")

    const audioConfig = getAudioConfig();
    if (!audioConfig) {
        console.error("missing audioConfig");
        return;
    }
    const autoDetectSourceLanguageConfig = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages([language1, language2]);
    conversationLanguageRecognizer = SpeechSDK.SpeechRecognizer.FromConfig(speechRecognitionConfig, autoDetectSourceLanguageConfig, audioConfig);

    conversationLanguageRecognizer.startContinuousRecognitionAsync(() => {
        console.log("conversation language detector started");
    });
    conversationLanguageRecognizer.recognizing = (s, e) => {
        applyDetectedConversationLanguage(getDetectedLanguage(e.result), false);
    };
    conversationLanguageRecognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            applyDetectedConversationLanguage(getDetectedLanguage(e.result), true);
        }
    };
}

function startContinuousTranslation(newSpeechRecognitionLanguage, newTargetLanguage) {
    const speechLang = newSpeechRecognitionLanguage || speechRecognitionLanguageOptions.value;
    const targetLang = newTargetLanguage || targetLanguageOptions.value;

    resetConversationLanguageDetection(speechLang);
    translationRecognizer1 = doContinuousTranslation(speechLang, targetLang);
    activeTranslationRecognizer = translationRecognizer1;
    speechRecognitionLanguage = speechLang;
    updateLanguageDisplays(speechLang, targetLang);
    if (conversationModeInput.checked) {
        translationRecognizer2 = doContinuousTranslation(targetLang, speechLang);
        activeTranslationRecognizer = translationRecognizer1;
        speechRecognitionLanguage = speechLang;
        startConversationMode(speechLang, targetLang);
    }
}

function stopAndCloseRecognizer(recognizer, onDone) {
    if (!recognizer) {
        onDone();
        return;
    }
    recognizer.stopContinuousRecognitionAsync(
        function () {
            recognizer.close();
            onDone();
        },
        function (error) {
            console.error("error stopping recognizer", error);
            try {
                recognizer.close();
            } catch (closeError) {
                console.error("error closing recognizer", closeError);
            }
            onDone();
        }
    );
}

/*
 * Stops continuous recognition on the active translation recognizer(s) and closes them.
 * isRestarting - when true, starts a new session after stop completes (used by restart and language switch)
 */
function stopContinuousTranslation(isRestarting = false) {
    console.log("stopContinuousTranslation");
    const recognizersToStop = [
        translationRecognizer1,
        translationRecognizer2,
        conversationLanguageRecognizer
    ].filter(Boolean);
    if (recognizersToStop.length === 0) return;

    const speechLang = speechRecognitionLanguageOptions.value;
    const targetLang = targetLanguageOptions.value;

    translationRecognizer1 = undefined;
    translationRecognizer2 = undefined;
    conversationLanguageRecognizer = undefined;
    activeTranslationRecognizer = undefined;
    resetConversationLanguageDetection(undefined);
    isListening = false;

    let pendingStops = recognizersToStop.length;
    const onStopped = function () {
        pendingStops -= 1;
        if (pendingStops > 0) return;
        if (isRestarting) startContinuousTranslation(speechLang, targetLang);
    };

    recognizersToStop.forEach((recognizer) => stopAndCloseRecognizer(recognizer, onStopped));
}

function switchActiveLanguages() {
    const newSpeechRecognitionLanguage = targetLanguageOptions.value;
    const newTargetLanguage = speechRecognitionLanguageOptions.value;

    speechRecognitionLanguageOptions.value = newSpeechRecognitionLanguage;
    targetLanguageOptions.value = newTargetLanguage;
    updateSavedSettingsValues();

    updateLanguageDisplays(newSpeechRecognitionLanguage, newTargetLanguage);
}

function onStartKeyPress() {
    // should only work on translate view
    startContinuousTranslation();
}

function onStopKeyPress() {
    stopContinuousTranslation();
}

function restartContinuousTranslation() {
    if (!isListening) return;
    stopContinuousTranslation(true);
}