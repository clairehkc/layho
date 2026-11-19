const onboardingStorageKey = "layho_onboarding_seen";

let onboardingTrigger;

function getOnboardingModal() {
    return document.getElementById("onboardingModal");
}

function isOnboardingOpen() {
    return getOnboardingModal()?.style.display === "flex";
}

function getOnboardingFocusableElements() {
    return Array.from(getOnboardingModal().querySelectorAll(
        "button:not([disabled]), a[href]"
    ));
}

function hasSeenOnboarding() {
    try {
        return localStorage.getItem(onboardingStorageKey) === "1";
    } catch (error) {
        try {
            return sessionStorage.getItem(onboardingStorageKey) === "1";
        } catch (sessionError) {
            return false;
        }
    }
}

function markOnboardingSeen() {
    try {
        localStorage.setItem(onboardingStorageKey, "1");
    } catch (error) {
        try {
            sessionStorage.setItem(onboardingStorageKey, "1");
        } catch (sessionError) {
            console.warn("Unable to save onboarding state.", sessionError);
        }
    }
}

function setOverlayInertForOnboarding(isOpen) {
    const settingsModal = typeof getSettingsModal === "function" ? getSettingsModal() : null;
    const signUpModal = typeof getSignUpModal === "function" ? getSignUpModal() : null;
    if (settingsModal) {
        settingsModal.inert = isOpen;
    }
    if (signUpModal) {
        signUpModal.inert = isOpen;
    }
}

function isAnotherModalOpen() {
    const settingsOpen = typeof getSettingsModal === "function"
        && getSettingsModal()?.style.display === "flex";
    const signUpOpen = typeof getSignUpModal === "function"
        && getSignUpModal()?.style.display === "flex";
    return Boolean(settingsOpen || signUpOpen);
}

function showOnboarding(trigger = document.activeElement) {
    const onboardingModal = getOnboardingModal();
    if (!onboardingModal || onboardingModal.style.display === "flex") {
        return;
    }

    onboardingTrigger = trigger;
    setOverlayInertForOnboarding(true);
    setBackgroundInert(true);
    onboardingModal.style.display = "flex";
    onboardingModal.setAttribute("aria-hidden", "false");
    document.getElementById("onboardingGotItButton").focus();
}

function closeOnboarding(shouldRestoreFocus = true) {
    const onboardingModal = getOnboardingModal();
    const wasOpen = onboardingModal.style.display === "flex";
    onboardingModal.style.display = "none";
    onboardingModal.setAttribute("aria-hidden", "true");
    markOnboardingSeen();
    setOverlayInertForOnboarding(false);

    if (!isAnotherModalOpen()) {
        setBackgroundInert(false);
    }

    if (wasOpen && shouldRestoreFocus && onboardingTrigger?.isConnected && !onboardingTrigger.hidden) {
        onboardingTrigger.focus();
    }
}

whenViewsReady(function () {
    document.getElementById("onboardingGotItButton").addEventListener("click", function () {
        closeOnboarding();
    });

    document.getElementById("onboardingCloseButton").addEventListener("click", function () {
        closeOnboarding();
    });

    document.getElementById("howToUseButton").addEventListener("click", function () {
        showOnboarding(document.getElementById("howToUseButton"));
    });

    document.addEventListener("keydown", (event) => {
        if (!isOnboardingOpen()) {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeOnboarding();
            return;
        }

        if (event.key === "Tab") {
            const focusableElements = getOnboardingFocusableElements();
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
            event.stopPropagation();
        }
    }, true);

    if (!hasSeenOnboarding()) {
        showOnboarding();
    }
});
