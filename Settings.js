const settingsCookieName = "layho_settings";
const settingsCookieMaxAgeSeconds = 31536000;
const defaultSpeechRecognitionLanguage = "zh-HK";
const defaultTargetLanguage = "en-US";

let speechRecognitionLanguageOptions;
let targetLanguageOptions;
let voiceOutputInput;
let conversationModeInput;
let transcriptionOnlyInput;

let settingsList;
let savedSettingsValues;
let settingsTrigger;
let openLanguageSelect = null;
let activeLanguageIndex = 0;
let languageTypeBuffer = "";
let languageTypeTimer = 0;

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
        conversationModeInput.checked,
        transcriptionOnlyInput.checked
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
        conversationMode: conversationModeInput.checked,
        transcriptionOnly: transcriptionOnlyInput.checked
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
    transcriptionOnlyInput.checked = Boolean(saved.transcriptionOnly);
    if (conversationModeInput.checked && transcriptionOnlyInput.checked) {
        transcriptionOnlyInput.checked = false;
    }
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

function setLanguageDisplayName(element, text) {
    if (!element) return;
    const name = element.querySelector(".languageDisplayName");
    (name || element).textContent = text;
}

function syncLanguageDisplaysFromSettings() {
    const fromOption = speechRecognitionLanguageOptions.selectedOptions[0];
    const toOption = targetLanguageOptions.selectedOptions[0];
    if (!fromOption || !toOption) return;
    setLanguageDisplayName(
        document.getElementById("speechRecognitionLanguageDisplay"),
        fromOption.dataset.displayName
    );
    setLanguageDisplayName(
        document.getElementById("targetLanguageDisplay"),
        toOption.dataset.displayName
    );
}

function restoreSettingsValues() {
    if (!savedSettingsValues) return;
    speechRecognitionLanguageOptions.value = savedSettingsValues[0];
    targetLanguageOptions.value = savedSettingsValues[1];
    voiceOutputInput.checked = savedSettingsValues[2];
    conversationModeInput.checked = savedSettingsValues[3];
    transcriptionOnlyInput.checked = savedSettingsValues[4];
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

function getSettingsScrollHintButton() {
    return document.getElementById("settingsScrollHintButton");
}

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function updateSettingsScrollHint() {
    const settingsModal = getSettingsModal();
    const container = getSettingsContainer();
    const hintButton = getSettingsScrollHintButton();
    if (!container || settingsModal.style.display !== "flex") {
        settingsModal.classList.remove("is-overflowing", "can-scroll-down", "can-scroll-up");
        if (hintButton) {
            hintButton.disabled = true;
        }
        return;
    }

    const maxScroll = container.scrollHeight - container.clientHeight;
    const canScroll = maxScroll > 1;
    const atTop = container.scrollTop <= 1;
    const atBottom = container.scrollTop >= maxScroll - 1;
    const canScrollDown = canScroll && !atBottom;

    settingsModal.classList.toggle("is-overflowing", canScroll);
    settingsModal.classList.toggle("can-scroll-down", canScrollDown);
    settingsModal.classList.toggle("can-scroll-up", canScroll && !atTop);
    if (hintButton) {
        hintButton.disabled = !canScrollDown;
    }
}

function scrollSettingsDown() {
    const container = getSettingsContainer();
    if (!container) return;
    container.scrollBy({
        top: Math.max(container.clientHeight * 0.8, 120),
        behavior: prefersReducedMotion() ? "auto" : "smooth"
    });
}

function canOpenSettings() {
    return Boolean(getSignInCookie());
}

function showSettings(trigger = document.activeElement) {
    if (!canOpenSettings()) {
        if (!getSignInCookie()) {
            setSettingsRoute(false);
        }
        return;
    }
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

function getLanguageList() {
    return document.getElementById("languageList");
}

function closeLanguageList() {
    const list = getLanguageList();
    const wasOpen = Boolean(openLanguageSelect);
    if (openLanguageSelect) {
        openLanguageSelect.setAttribute("aria-expanded", "false");
        openLanguageSelect.removeAttribute("aria-activedescendant");
    }
    openLanguageSelect = null;
    languageTypeBuffer = "";
    clearTimeout(languageTypeTimer);
    if (list) {
        list.hidden = true;
        list.replaceChildren();
    }
    return wasOpen;
}

function positionLanguageList() {
    const list = getLanguageList();
    if (!openLanguageSelect || !list || list.hidden) return;

    const rect = openLanguageSelect.getBoundingClientRect();
    const gap = 6;
    const below = window.innerHeight - rect.bottom - gap;
    const above = rect.top - gap;
    const openAbove = below < 140 && above > below;
    const maxHeight = Math.max(80, Math.min(280, openAbove ? above : below));
    list.style.maxHeight = `${maxHeight}px`;
    list.style.left = `${Math.round(rect.left)}px`;
    list.style.width = `${Math.round(rect.width)}px`;
    list.style.top = openAbove
        ? `${Math.round(rect.top - gap - list.offsetHeight)}px`
        : `${Math.round(rect.bottom + gap)}px`;
}

function setActiveLanguageOption(index) {
    const list = getLanguageList();
    const options = [...list.querySelectorAll(".languageListOption")];
    if (!options.length) return;

    activeLanguageIndex = (index + options.length) % options.length;
    options.forEach((option, optionIndex) => {
        const isActive = optionIndex === activeLanguageIndex;
        option.classList.toggle("is-active", isActive);
        if (isActive) {
            list.setAttribute("aria-activedescendant", option.id);
            openLanguageSelect?.setAttribute("aria-activedescendant", option.id);
            const listTop = list.scrollTop;
            const listBottom = listTop + list.clientHeight;
            if (option.offsetTop < listTop) {
                list.scrollTop = option.offsetTop;
            } else if (option.offsetTop + option.offsetHeight > listBottom) {
                list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
            }
        }
    });
}

function openLanguageList(select) {
    const list = getLanguageList();
    if (!list || !select.options.length) return;

    closeLanguageList();
    openLanguageSelect = select;
    const label = document.querySelector(`label[for="${select.id}"]`);
    list.setAttribute("aria-label", label ? label.textContent.replace(/:$/, "") : "Languages");
    list.style.font = getComputedStyle(select).font;

    [...select.options].forEach((option, index) => {
        const item = document.createElement("div");
        item.className = "languageListOption";
        item.id = `languageListOption-${index}`;
        item.setAttribute("role", "option");
        item.dataset.value = option.value;
        item.textContent = option.textContent;
        item.setAttribute("aria-selected", option.selected ? "true" : "false");
        list.appendChild(item);
    });

    list.hidden = false;
    select.setAttribute("aria-expanded", "true");
    positionLanguageList();
    setActiveLanguageOption(Math.max(select.selectedIndex, 0));
}

function commitLanguageOption(value) {
    const select = openLanguageSelect;
    if (!select) return;
    if (select.value !== value) {
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    closeLanguageList();
    select.focus();
}

function moveActiveLanguageOption(delta) {
    setActiveLanguageOption(activeLanguageIndex + delta);
}

function typeLanguageOption(character) {
    const list = getLanguageList();
    languageTypeBuffer += character.toLowerCase();
    clearTimeout(languageTypeTimer);
    languageTypeTimer = setTimeout(() => {
        languageTypeBuffer = "";
    }, 500);

    const options = [...list.querySelectorAll(".languageListOption")];
    const start = activeLanguageIndex + (languageTypeBuffer.length > 1 ? 0 : 1);
    for (let offset = 0; offset < options.length; offset += 1) {
        const option = options[(start + offset) % options.length];
        if (option.textContent.toLowerCase().startsWith(languageTypeBuffer)) {
            setActiveLanguageOption((start + offset) % options.length);
            return;
        }
    }
}

function onLanguageSelectPointerDown(event) {
    event.preventDefault();
    const select = event.currentTarget;
    select.focus();
    if (openLanguageSelect === select) {
        closeLanguageList();
        return;
    }
    openLanguageList(select);
}

function onLanguageSelectKeyDown(event) {
    const select = event.currentTarget;
    const listOpen = openLanguageSelect === select;

    if (!listOpen) {
        if (event.key === "Enter" || event.key === " " || (event.key === "ArrowDown" && event.altKey)) {
            event.preventDefault();
            openLanguageList(select);
        }
        return;
    }

    if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeLanguageList();
        return;
    }
    if (event.key === "ArrowDown") {
        event.preventDefault();
        moveActiveLanguageOption(1);
        return;
    }
    if (event.key === "ArrowUp") {
        event.preventDefault();
        moveActiveLanguageOption(-1);
        return;
    }
    if (event.key === "Home") {
        event.preventDefault();
        setActiveLanguageOption(0);
        return;
    }
    if (event.key === "End") {
        event.preventDefault();
        const list = getLanguageList();
        setActiveLanguageOption(list.querySelectorAll(".languageListOption").length - 1);
        return;
    }
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const active = getLanguageList().querySelector(".languageListOption.is-active");
        if (active) commitLanguageOption(active.dataset.value);
        return;
    }
    if (event.key === "Tab") {
        closeLanguageList();
        return;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        typeLanguageOption(event.key);
    }
}

function hideSettings(shouldRestoreFocus = true) {
    closeLanguageList();
    const settingsModal = getSettingsModal();
    const wasOpen = settingsModal.style.display === "flex";
    settingsModal.style.display = 'none';
    settingsModal.setAttribute("aria-hidden", "true");
    settingsModal.classList.remove("is-overflowing", "can-scroll-down", "can-scroll-up");
    const hintButton = getSettingsScrollHintButton();
    if (hintButton) {
        hintButton.disabled = true;
    }
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

function setSpeechStatus(message) {
    document.getElementById("speechStatus").textContent = message;
}

function applyConversationTranscriptionExclusivity(changedInput) {
    if (changedInput === conversationModeInput && conversationModeInput.checked && transcriptionOnlyInput.checked) {
        transcriptionOnlyInput.checked = false;
        setSpeechStatus("Conversation mode on. Transcription only turned off.");
        return true;
    }
    if (changedInput === transcriptionOnlyInput && transcriptionOnlyInput.checked && conversationModeInput.checked) {
        conversationModeInput.checked = false;
        setSpeechStatus("Transcription only on. Conversation mode turned off.");
        return true;
    }
    return false;
}

function onConversationModeToggle() {
    applyConversationTranscriptionExclusivity(conversationModeInput);
    if (conversationModeInput.checked && voiceOutputInput.checked) {
        voiceOutputInput.checked = false;
        setSpeechStatus("Conversation mode on. Voice output turned off.");
    }
}

function onTranscriptionOnlyToggle() {
    applyConversationTranscriptionExclusivity(transcriptionOnlyInput);
}

function bindExclusiveToggle(input, onToggle) {
    input.addEventListener("change", onToggle);
    input.addEventListener("input", onToggle);
    const switchLabel = input.closest("label.switch");
    if (switchLabel) {
        switchLabel.addEventListener("click", () => {
            queueMicrotask(onToggle);
        });
    }
}

function submitSettings() {
    applyConversationTranscriptionExclusivity(
        transcriptionOnlyInput.checked ? transcriptionOnlyInput : conversationModeInput
    );
    const didChange = didSettingsChange();
    updateSavedSettingsValues();
    hideSettings();
    if (typeof syncTranscriptionOnlyUi === "function") {
        syncTranscriptionOnlyUi();
    }
    if (didChange) {
        restartContinuousTranslation();
        setSpeechStatus("Settings applied.");
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
    if (typeof syncTranscriptionOnlyUi === "function") {
        syncTranscriptionOnlyUi();
    }

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
    transcriptionOnlyInput = document.getElementById("transcriptionOnlyInput");
    populateLanguageOptions();

    voiceOutputInput.addEventListener("change", () => {
        if (voiceOutputInput.checked && conversationModeInput.checked) {
            conversationModeInput.checked = false;
            setSpeechStatus("Voice output on. Conversation mode turned off.");
        }
    });

    bindExclusiveToggle(conversationModeInput, onConversationModeToggle);
    bindExclusiveToggle(transcriptionOnlyInput, onTranscriptionOnlyToggle);

    const languageList = getLanguageList();
    [speechRecognitionLanguageOptions, targetLanguageOptions].forEach((select) => {
        select.setAttribute("aria-expanded", "false");
        select.setAttribute("aria-controls", "languageList");
        select.addEventListener("pointerdown", onLanguageSelectPointerDown);
        select.addEventListener("keydown", onLanguageSelectKeyDown);
        const label = document.querySelector(`label[for="${select.id}"]`);
        label?.addEventListener("click", (event) => {
            event.preventDefault();
            select.focus();
            if (openLanguageSelect === select) {
                closeLanguageList();
                return;
            }
            openLanguageList(select);
        });
    });
    languageList.addEventListener("pointerdown", (event) => {
        event.preventDefault();
    });
    languageList.addEventListener("pointermove", (event) => {
        const option = event.target.closest(".languageListOption");
        if (!option || !languageList.contains(option)) return;
        setActiveLanguageOption([...languageList.children].indexOf(option));
    });
    languageList.addEventListener("pointerup", (event) => {
        const option = event.target.closest(".languageListOption");
        if (!option || !languageList.contains(option)) return;
        commitLanguageOption(option.dataset.value);
    });
    document.addEventListener("pointerdown", (event) => {
        if (!openLanguageSelect) return;
        const label = document.querySelector(`label[for="${openLanguageSelect.id}"]`);
        if (
            event.target === openLanguageSelect
            || label?.contains(event.target)
            || languageList.contains(event.target)
        ) return;
        closeLanguageList();
    });
    getSettingsContainer().addEventListener("scroll", positionLanguageList, { passive: true });
    window.addEventListener("resize", positionLanguageList);

    [voiceOutputInput, conversationModeInput, transcriptionOnlyInput].forEach((input) => {
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
    getSettingsScrollHintButton().addEventListener("click", scrollSettingsDown);
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
            if (closeLanguageList()) return;
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
