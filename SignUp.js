let signUpTrigger;
let toastTimeout;
const web3formsAccessKey = "b5ebb5ce-e035-4ca6-b28e-7557996c2a60";
const web3formsSubmitUrl = "https://api.web3forms.com/submit";

function getSignUpModal() {
    return document.getElementById("signUpModal");
}

function getSignUpFocusableElements() {
    return Array.from(getSignUpModal().querySelectorAll(
        "button:not([disabled]), input:not([disabled]):not([hidden])"
    ));
}

function setSignUpSubmitting(isSubmitting) {
    const form = document.getElementById("signUpForm");
    const submitButton = document.getElementById("signUpSubmitButton");
    form.setAttribute("aria-busy", isSubmitting ? "true" : "false");
    submitButton.disabled = isSubmitting;
    submitButton.querySelector(".buttonLabel").textContent = isSubmitting ? "Submitting" : "Submit";
}

async function submitSignUp(formData) {
    formData.append("access_key", web3formsAccessKey);
    formData.append("subject", "New Layho signup");
    formData.append("from_name", "Layho");

    const response = await fetch(web3formsSubmitUrl, {
        method: "POST",
        body: formData,
    });

    const result = await response.json();
    if (!response.ok || result.success === false) {
        throw new Error(result.message || "Sign-up failed.");
    }
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

    document.getElementById("signUpForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        setSignUpSubmitting(true);
        try {
            await submitSignUp(formData);
            form.reset();
            closeSignUp();
            showToast("Thanks for signing up!");
        } catch (error) {
            console.error(error);
            showToast("Couldn't send your signup. Please try again.");
        } finally {
            setSignUpSubmitting(false);
        }
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
