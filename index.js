const signInCookieName = "layho_jwt";
const googleClientId = "699001412765-r6d8ck46h18u9uk7b4dlddncospqcci1.apps.googleusercontent.com";
const googleNonceStorageKey = "layho_google_nonce";
const googleStateStorageKey = "layho_google_state";

function getCookieAttributes() {
    if (window.isSecureContext) {
        return "Path=/; SameSite=None; Secure";
    }
    return "Path=/; SameSite=Lax";
}

function getCookie(name) {
    const value = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")
        .slice(1)
        .join("=");

    return value ? decodeURIComponent(value) : undefined;
}

function setCookie(name, value, maxAgeSeconds) {
    document.cookie = `${name}=${encodeURIComponent(value)}; ${getCookieAttributes()}; Max-Age=${maxAgeSeconds}`;
}

function clearCookie(name) {
    document.cookie = `${name}=; ${getCookieAttributes()}; Max-Age=0`;
}

function setSignInCookie(token) {
    setCookie(signInCookieName, token, 604800);
}

function clearSignInCookie() {
    clearCookie(signInCookieName);
}

function getSignInCookie() {
    return getCookie(signInCookieName);
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

function needsRedirectSignIn() {
    const userAgent = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(userAgent)
        || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function randomOAuthValue() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getGoogleRedirectUri() {
    const redirectUrl = new URL(".", window.location.href);
    redirectUrl.search = "";
    redirectUrl.hash = "";
    return redirectUrl.href;
}

function decodeJwtPayload(token) {
    const payload = token.split(".")[1];
    if (!payload) {
        throw new Error("Invalid token");
    }

    const padded = payload.replace(/-/g, "+").replace(/_/g, "/")
        + "=".repeat((4 - payload.length % 4) % 4);
    return JSON.parse(atob(padded));
}

function clearOAuthParamsFromUrl() {
    history.replaceState(null, "", window.location.pathname);
}

function notifyGoogleSignInError(message) {
    console.error(message);
    if (typeof showToast === "function") {
        showToast("Couldn't sign in with Google. Please try again.");
    }
}

function startGoogleRedirectSignIn() {
    const nonce = randomOAuthValue();
    const state = randomOAuthValue();
    sessionStorage.setItem(googleNonceStorageKey, nonce);
    sessionStorage.setItem(googleStateStorageKey, state);

    const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: getGoogleRedirectUri(),
        response_type: "id_token",
        scope: "openid email profile",
        nonce,
        state,
        prompt: "select_account",
    });
    window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

function renderRedirectSignInButton() {
    const container = document.getElementById("signInButton");
    if (!container || container.querySelector("[data-google-redirect-button]")) {
        return;
    }

    container.replaceChildren();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "googleRedirectButton";
    button.dataset.googleRedirectButton = "true";
    button.setAttribute("aria-label", "Sign in with Google");
    button.innerHTML = '<svg class="googleLogo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Sign in with Google</span>';
    button.addEventListener("click", startGoogleRedirectSignIn);
    container.appendChild(button);
}

function consumeGoogleRedirectResult() {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const error = queryParams.get("error") || hashParams.get("error");
    const idToken = hashParams.get("id_token");
    const state = hashParams.get("state") || queryParams.get("state");

    if (!error && !idToken) {
        return false;
    }

    const expectedState = sessionStorage.getItem(googleStateStorageKey);
    const expectedNonce = sessionStorage.getItem(googleNonceStorageKey);
    sessionStorage.removeItem(googleStateStorageKey);
    sessionStorage.removeItem(googleNonceStorageKey);
    clearOAuthParamsFromUrl();

    if (error) {
        if (error !== "access_denied") {
            notifyGoogleSignInError(`Google Sign-In failed: ${error}`);
        }
        return false;
    }

    if (!expectedState || state !== expectedState) {
        notifyGoogleSignInError("Google Sign-In state mismatch.");
        return false;
    }

    try {
        if (decodeJwtPayload(idToken).nonce !== expectedNonce) {
            notifyGoogleSignInError("Google Sign-In nonce mismatch.");
            return false;
        }
    } catch (decodeError) {
        notifyGoogleSignInError(decodeError.message);
        return false;
    }

    handleCredentialResponse({ credential: idToken });
    return true;
}

function checkSignedIn() {
    if (consumeGoogleRedirectResult()) {
        return;
    }

    const savedToken = getSignInCookie();

    if (savedToken) {
        fetchApiKey(savedToken);
    } else {
        showSignInControls();
        updateAuthActionButton(false);
    }
}

function setSignedInAppButtons(isSignedIn) {
    const startAppButton = document.getElementById("startAppButton");
    const settingsButton = document.getElementById("settingsButton");

    startAppButton.disabled = !isSignedIn;
    settingsButton.disabled = !isSignedIn;
    startAppButton.querySelector(".buttonLabel").textContent = isSignedIn ? "Start" : "Sign in to start";
    settingsButton.querySelector(".buttonLabel").textContent = isSignedIn ? "Settings" : "Sign in for settings";
}

function onSignIn(name) {
    document.getElementById("nameText").textContent = name;
    setSignedInAppButtons(true);
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
    setSignedInAppButtons(false);
}

function initGoogleSignIn() {
    if (window.location.protocol === "file:") {
        console.error(
            "Google Sign-In requires http://localhost — open the page with a local server, not as a file."
        );
        return;
    }

    if (needsRedirectSignIn()) {
        renderRedirectSignInButton();
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
    const introTextContainer = document.getElementById("introTextContainer");
    const buttonWidth = Math.max(200, Math.min(240, Math.floor(introTextContainer.clientWidth || 240)));
    google.accounts.id.renderButton(
        document.getElementById("signInButton"),
        { theme: "outline", size: "large", type: "standard", text: "signin_with", width: buttonWidth }
    );
}

whenViewsReady(function () {
    const signOutButton = document.getElementById("signOutButton");
    signOutButton.addEventListener("click", function () {
        onSignOut();
    });

    const signUpButton = document.getElementById("signUpButton");
    signUpButton.addEventListener("click", function () {
        showSignUp(signUpButton);
    });

    const settingsButton = document.getElementById("settingsButton");
    settingsButton.addEventListener("click", function () {
        if (settingsButton.disabled) return;
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

    if (needsRedirectSignIn()) {
        renderRedirectSignInButton();
    }

    checkSignedIn();
});
