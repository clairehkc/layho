const signInCookieName = "layho_jwt";
const googleClientId = "699001412765-r6d8ck46h18u9uk7b4dlddncospqcci1.apps.googleusercontent.com";

function getCookieAttributes() {
    if (window.isSecureContext) {
        return "Path=/; SameSite=None; Secure";
    }
    return "Path=/; SameSite=Lax";
}

function setSignInCookie(token) {
    document.cookie = `${signInCookieName}=${encodeURIComponent(token)}; ${getCookieAttributes()}; Max-Age=604800`;
}

function clearSignInCookie() {
    document.cookie = `${signInCookieName}=; ${getCookieAttributes()}; Max-Age=0`;
}

function getSignInCookie() {
    const value = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${signInCookieName}=`))
        ?.split("=")
        .slice(1)
        .join("=");

    return value ? decodeURIComponent(value) : undefined;
}

async function fetchApiKey(token) {
    const loginUrl = "https://7txxt2ts1e.execute-api.us-west-1.amazonaws.com/stage/loginLayho";
    try {
        const response = await fetch(loginUrl, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const json = await response.json();

        if (json.statusCode === 200) {
            onSignIn(json.body.name);
            apiKey = json.body.key;
        } else {
            showSignInControls();
        }

        return apiKey;
    } catch (error) {
        console.error(error.message);
    }
}

function showSignInControls() {
    document.getElementById("signInButton").style.display = 'flex';
}

function hideSignInControls() {
    document.getElementById("signInButton").style.display = 'none';
}

function updateAuthActionButton(isSignedIn) {
    document.getElementById("signUpButton").hidden = isSignedIn;
    document.getElementById("signOutButton").hidden = !isSignedIn;
}

function handleCredentialResponse(response) {
    setSignInCookie(response.credential);
    fetchApiKey(response.credential);
    hideSignInControls();
    updateAuthActionButton(true);
}

function checkSignedIn() {
    const savedToken = getSignInCookie();

    if (savedToken) {
        fetchApiKey(savedToken);
    } else {
        showSignInControls();
        updateAuthActionButton(false);
    }
}

function onSignIn(name) {
    document.getElementById("nameText").textContent = name;
    document.getElementById("startAppButton").disabled = false;
    hideSignInControls();
    updateAuthActionButton(true);
}

function onSignOut() {
    clearSignInCookie();
    if (window.google?.accounts?.id) {
        google.accounts.id.disableAutoSelect();
    }
    apiKey = undefined;
    updateAuthActionButton(false);
    showSignInControls();
    document.getElementById("nameText").textContent = "";
    document.getElementById("startAppButton").disabled = true;
}

let signUpTrigger;

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
    document.getElementById("introContainer").inert = true;
    document.getElementById("translationContainer").inert = true;
    signUpModal.style.display = "flex";
    signUpModal.setAttribute("aria-hidden", "false");
    document.getElementById("signUpNameInput").focus();
}

function closeSignUp(shouldRestoreFocus = true) {
    const signUpModal = getSignUpModal();
    const wasOpen = signUpModal.style.display === "flex";
    signUpModal.style.display = "none";
    signUpModal.setAttribute("aria-hidden", "true");
    document.getElementById("introContainer").inert = false;
    document.getElementById("translationContainer").inert = false;

    if (wasOpen && shouldRestoreFocus && signUpTrigger?.isConnected && !signUpTrigger.hidden) {
        signUpTrigger.focus();
    }
}

let toastTimeout;

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("visible");
    }, 4000);
}

function initGoogleSignIn() {
    if (window.location.protocol === "file:") {
        console.error(
            "Google Sign-In requires http://localhost — open the page with a local server, not as a file."
        );
        return;
    }

    if (!window.google?.accounts?.id) {
        console.error("Google Identity Services failed to load.");
        return;
    }

    google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        use_fedcm_for_button: false,
    });
    google.accounts.id.renderButton(
        document.getElementById("signInButton"),
        { theme: "outline", size: "large", type: "standard", text: "signin_with", width: 240 }
    );
}

document.addEventListener("DOMContentLoaded", function () {
    const signOutButton = document.getElementById("signOutButton");
    signOutButton.addEventListener("click", function () {
        onSignOut();
    });

    const signUpButton = document.getElementById("signUpButton");
    signUpButton.addEventListener("click", function () {
        showSignUp(signUpButton);
    });

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

    const settingsButton = document.getElementById("settingsButton");
    settingsButton.addEventListener("click", function () {
        showSettings();
    });

    const startAppButton = document.getElementById("startAppButton");
    startAppButton.addEventListener("click", function () {
        if (startAppButton.disabled) return;
        document.getElementById("introContainer").style.display = 'none';
        document.getElementById("translationContainer").style.display = 'flex';
        document.getElementById("startButton").focus();
        document.getElementById("speechStatus").textContent = "Translation view.";
    });

    checkSignedIn();
});

