let signUpTrigger;
let toastTimeout;

function getSignUpModal() {
    return document.getElementById("signUpModal");
}

function getSignUpFocusableElements() {
    return Array.from(getSignUpModal().querySelectorAll(
        "button:not([disabled]), input:not([disabled])"
    ));
}

function showSignUp(trigger = document.activeElement) {
    const signUpModal = getSignUpModal();
    signUpTrigger = trigger;
    setBackgroundInert(true);
    signUpModal.style.display = "flex";
    signUpModal.setAttribute("aria-hidden", "false");
    document.getElementById("signUpNameInput").focus();
}

function closeSignUp(shouldRestoreFocus = true) {
    const signUpModal = getSignUpModal();
    const wasOpen = signUpModal.style.display === "flex";
    signUpModal.style.display = "none";
    signUpModal.setAttribute("aria-hidden", "true");
    setBackgroundInert(false);

    if (wasOpen && shouldRestoreFocus && signUpTrigger?.isConnected && !signUpTrigger.hidden) {
        signUpTrigger.focus();
    }
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("visible");
    }, 4000);
}

whenViewsReady(function () {
    document.getElementById("signUpCloseButton").addEventListener("click", function () {
        closeSignUp();
    });

    document.getElementById("signUpForm").addEventListener("submit", function (event) {
        event.preventDefault();
        event.target.reset();
        closeSignUp();
        showToast("Thanks for signing up! We'll get back to you soon.");
    });

    document.addEventListener("keydown", (event) => {
        const signUpModal = getSignUpModal();
        if (signUpModal.style.display !== "flex") {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            closeSignUp();
            return;
        }

        if (event.key === "Tab") {
            const focusableElements = getSignUpFocusableElements();
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
