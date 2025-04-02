// extended from https://github.com/Azure-Samples/cognitive-services-speech-sdk/tree/master/samples/js/browser

const region = "westus";
let apiKey;
let SpeechSDK;
let startButton, stopButton;
let isListening = false;
let speechRecognitionLanguage;
let targetLanguage;
let activeTranslationRecognizer;
let translationRecognizer1;
let translationRecognizer2;

let soundContext = undefined;
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

function resetUiForScenarioStart() {
    detected.textContent = "";
    translated.textContent = "";
}

document.addEventListener("DOMContentLoaded", function () {
    startButton = document.getElementById('startButton');
    stopButton = document.getElementById('stopButton');

    detected = document.getElementById("detected");
    translated = document.getElementById("translated");

    const speechRecognitionLanguageOptions = document.getElementById("speechRecognitionLanguageOptions");
    const targetLanguageOptions = document.getElementById("targetLanguageOptions");

    const speechRecognitionLanguageDisplay =  document.getElementById("speechRecognitionLanguageDisplay");
    const targetLanguageDisplay =  document.getElementById("targetLanguageDisplay");
    const switchLanguageButton = document.getElementById("switchLanguageButton");

    const voiceOutput = document.getElementById("voiceOutput");
    const conversationMode = document.getElementById("conversationMode");

    startButton.addEventListener("click", function () {
        startContinuousTranslation();
    });
    stopButton.addEventListener("click", function() {
        stopContinuousTranslation();
    });

    switchLanguageButton.addEventListener("click", function() {
        switchActiveLanguages();
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
        document.getElementById("translationContainer").style.display = 'none';
        document.getElementById("introContainer").style.display = 'flex';
        closeSettings();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === "s") {
            if (!isListening) {
                onStartKeyPress();
            } else {
                onStopKeyPress();
            }
        }
    });

    speechRecognitionLanguageOptions.addEventListener('change', (event) =>  {
        speechRecognitionLanguageDisplay.textContent = speechRecognitionLanguageOptions.selectedOptions[0].textContent;
    });

    targetLanguageOptions.addEventListener('change', (event) =>  {
        targetLanguageDisplay.textContent = targetLanguageOptions.selectedOptions[0].textContent;
    })
    speechRecognitionLanguageDisplay.textContent = speechRecognitionLanguageOptions.selectedOptions[0].textContent;
    targetLanguageDisplay.textContent = targetLanguageOptions.selectedOptions[0].textContent;
});

function Initialize(onComplete) {
    if (!!window.SpeechSDK) {
        onComplete(window.SpeechSDK);
    }
}

function getAudioConfig() {
    return SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
}

function getSpeechConfig(sdkConfigType, detectedLanguage = undefined, newTargetLanguage = undefined, newTranslationVoice = undefined) {
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
        targetLanguage = newTargetLanguage || selectedTargetLanguage.substring(0, 5);
        targetLanguageDisplay.textContent = targetLanguage;
        speechConfig.addTargetLanguage(targetLanguage);
        console.log("target language:", targetLanguage);
        

        // If voice output is requested, set the target voice.
        // If multiple text translations were requested, only the first one added will have audio synthesised for it.
        if (voiceOutput.checked) {
            const translationVoice = newTranslationVoice || selectedTargetLanguage;
            speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_TranslationVoice, translationVoice);
        }
    }

    speechConfig.speechRecognitionLanguage = detectedLanguage || speechRecognitionLanguageOptions.value;
    speechRecognitionLanguage = speechConfig.speechRecognitionLanguage;
    speechRecognitionLanguageDisplay.textContent = speechRecognitionLanguage;
    console.log("recognition language:", speechRecognitionLanguage);
    return speechConfig;
}

function onRecognizing(sender, recognitionEventArgs) {
    if (sender.speechRecognitionLanguage !== speechRecognitionLanguage) return;
    const result = recognitionEventArgs.result;
    if (result.text) detected.textContent = detected.textContent.replace(/(.*)(^|[\r\n]+).*\[\.\.\.\][\r\n]+/, '$1$2')
        + `${result.text} [...]\r\n`;
}

function onRecognized(sender, recognitionEventArgs) {
    if (sender.speechRecognitionLanguage !== speechRecognitionLanguage) return;
    const result = recognitionEventArgs.result;
    onRecognizedResult(recognitionEventArgs.result);
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
                    translated.textContent = `${translation.Text}\r\n`;
                });
            }
            break;
    }
}

function onSessionStarted(sender, sessionEventArgs) {
    startButton.disabled = true;
    stopButton.disabled = false;
}

function onSessionStopped(sender, sessionEventArgs) {
    startButton.disabled = false;
    stopButton.disabled = true;
}

function onCanceled (sender, cancellationEventArgs) {
    window.console.log(cancellationEventArgs);

    if (cancellationEventArgs.reason === SpeechSDK.CancellationReason.Error) {
        console.error("cancel due to error", cancellationEventArgs.errorDetails);
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

function doContinuousTranslation(detectedLanguage = undefined, newTargetLanguage = undefined, newTranslationVoice = undefined) {
    console.log("doContinuousTranslation", detectedLanguage, newTargetLanguage);
    if (!apiKey) {
        console.error('no apiKey');
        return undefined;
    }

    isListening = true;
    resetUiForScenarioStart();

    const audioConfig = getAudioConfig();
    const speechConfig = getSpeechConfig(SpeechSDK.SpeechTranslationConfig, detectedLanguage, newTargetLanguage, newTranslationVoice);
    if (!audioConfig || !speechConfig) return;

    // Create the TranslationRecognizer and set up common event handlers and PhraseListGrammar data.
    activeTranslationRecognizer = new SpeechSDK.TranslationRecognizer(speechConfig, audioConfig);
    applyCommonConfigurationTo(activeTranslationRecognizer);
    console.log("speechConfig", speechConfig);

    // Additive in TranslationRecognizer, the 'synthesizing' event signals that a payload chunk of synthesized
    // text-to-speech data is available for playback.
    // If the event result contains valid audio, it's reason will be ResultReason.SynthesizingAudio
    // Once a complete phrase has been synthesized, the event will be called with
    // ResultReason.SynthesizingAudioComplete and a 0-byte audio payload.
    activeTranslationRecognizer.synthesizing = function (s, e) {
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
    activeTranslationRecognizer.startContinuousRecognitionAsync();

    if (conversationMode.checked) {
        // continuous language recognition and automatic switching
        const speechRecognitionConfig = SpeechSDK.SpeechConfig.fromEndpoint(new URL(`wss://${region}.stt.speech.microsoft.com/speech/universal/v2`), apiKey);
        speechRecognitionConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode, "Continuous")

        const autoDetectSourceLanguageConfig = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(["en-US", "zh-HK",]);
        const speechRecognizer = SpeechSDK.SpeechRecognizer.FromConfig(speechRecognitionConfig, autoDetectSourceLanguageConfig, audioConfig);

        speechRecognizer.startContinuousRecognitionAsync(() => {
            console.log("speechRecognizer started");
        });
        speechRecognizer.recognized = async (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                const detectedLanguage = e.result.privLanguage;
                console.log("speechRecognitionLanguage", speechRecognitionLanguage);
                console.log("detectedLanguage", detectedLanguage);
                if (speechRecognitionLanguage && detectedLanguage !== speechRecognitionLanguage) {
                    if (!(translationRecognizer1 && translationRecognizer2)) {
                        console.error("missing translationRecognizers for automatic switching");
                        return;
                    }

                    if (detectedLanguage == "en-US") {
                        speechRecognitionLanguage = "en-US";
                        activeTranslationRecognizer = translationRecognizer2;
                        console.log("set translationRecognizer2");
                    } else {
                        speechRecognitionLanguage = "zh-HK";
                        activeTranslationRecognizer = translationRecognizer1;
                        console.log("set translationRecognizer1");
                    }
                }
            }
        }
    }
    return activeTranslationRecognizer;
}

function startContinuousTranslation(speechRecognitionLanguage, newTargetLanguage) {
    translationRecognizer1 = doContinuousTranslation(speechRecognitionLanguage, newTargetLanguage);
    if (conversationMode.checked) {
        translationRecognizer2 = doContinuousTranslation("en-US", "yue", "zh-HK-HiuMaanNeural");
        speechRecognitionLanguage = "zh-HK";
        activeTranslationRecognizer = translationRecognizer1;
    }
}

function stopContinuousTranslation() {
    console.log("stopContinuousTranslation");
    if (!activeTranslationRecognizer) return;
    translationRecognizer1.stopContinuousRecognitionAsync(
        function () {
            translationRecognizer1.close();
            activeTranslationRecognizer = undefined;
            translationRecognizer1 = undefined;
        }
    );

    if (translationRecognizer2) {
        translationRecognizer2.stopContinuousRecognitionAsync(
            function () {
                translationRecognizer2.close();
                translationRecognizer2 = undefined;
            }
        );
    }
    isListening = false;
}

function switchActiveLanguages() {
    translationRecognizer1.stopContinuousRecognitionAsync(
        function () {
            translationRecognizer1.close();
            activeTranslationRecognizer = undefined;
            translationRecognizer1 = undefined;
            startContinuousTranslation(targetLanguage, speechRecognitionLanguage);
        }
    );
}

function onStartKeyPress() {
    startContinuousTranslation();
}

function onStopKeyPress() {
    stopContinuousTranslation();
}