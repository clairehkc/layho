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
    document.getElementById("signInButtonHost").hidden = false;
}

function hideSignInControls() {
    document.getElementById("signInButtonHost").hidden = true;
}

function needsRedirectSignIn() {
    const userAgent = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(userAgent)
        || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
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
    if (redirectUrl.pathname === "/") {
        return redirectUrl.origin;
    }
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

function getGoogleAuthUrl() {
    const nonce = randomOAuthValue();
    const state = randomOAuthValue();
    sessionStorage.setItem(googleNonceStorageKey, nonce);
    sessionStorage.setItem(googleStateStorageKey, state);

    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: getGoogleRedirectUri(),
        response_type: "id_token",
        scope: "openid email profile",
        nonce,
        state,
        prompt: "select_account",
    })}`;
}

function completeGoogleAuthResult({ idToken, state, error }) {
    const expectedState = sessionStorage.getItem(googleStateStorageKey);
    const expectedNonce = sessionStorage.getItem(googleNonceStorageKey);
    if (!expectedState && !expectedNonce) {
        return false;
    }

    sessionStorage.removeItem(googleStateStorageKey);
    sessionStorage.removeItem(googleNonceStorageKey);

    if (error) {
        if (error !== "access_denied") {
            notifyGoogleSignInError(`Google Sign-In failed: ${error}`);
        }
        return false;
    }

    if (!idToken) {
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

function startGoogleRedirectSignIn() {
    window.location.assign(getGoogleAuthUrl());
}

function watchGoogleSignInPopup(popup) {
    const timer = setInterval(() => {
        if (!popup || popup.closed) {
            clearInterval(timer);
            return;
        }

        try {
            const popupUrl = new URL(popup.location.href);
            if (popupUrl.origin !== window.location.origin) {
                return;
            }

            const hashParams = new URLSearchParams(popupUrl.hash.slice(1));
            const queryParams = new URLSearchParams(popupUrl.search);
            const idToken = hashParams.get("id_token");
            const error = queryParams.get("error") || hashParams.get("error");
            const state = hashParams.get("state") || queryParams.get("state");
            if (!idToken && !error) {
                return;
            }

            popup.close();
            clearInterval(timer);
            completeGoogleAuthResult({ idToken, state, error });
        } catch (error) {
            // The popup stays on accounts.google.com until it redirects back.
        }
    }, 200);
}

function startGooglePopupSignIn() {
    window.google?.accounts?.id?.cancel?.();

    const width = 500;
    const height = 640;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open(
        getGoogleAuthUrl(),
        "layho_google_signin",
        `popup=yes,width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
        notifyGoogleSignInError("Couldn't open Google Sign-In. Allow popups for this site.");
        return;
    }

    popup.focus();
    watchGoogleSignInPopup(popup);
}

function startGoogleSignIn() {
    if (needsRedirectSignIn() || !window.google?.accounts?.id) {
        startGoogleRedirectSignIn();
        return;
    }

    startGooglePopupSignIn();
}

function renderGisOverlayButton() {
    const overlay = document.getElementById("googleGisButton");
    if (!overlay || overlay.querySelector("iframe") || !window.google?.accounts?.id) {
        return;
    }

    google.accounts.id.renderButton(overlay, {
        theme: "outline",
        size: "large",
        type: "standard",
        text: "signin_with",
        width: Math.max(200, Math.min(240, Math.floor(overlay.clientWidth || 240))),
    });
    demoteGoogleIframes();
}

function demoteGoogleIframes() {
    document.querySelectorAll('iframe[src*="accounts.google.com"], iframe[src*="gsi"]').forEach((iframe) => {
        iframe.tabIndex = -1;
        iframe.setAttribute("aria-hidden", "true");
    });
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

    if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "layho-google-auth", idToken, state, error }, window.location.origin);
        window.close();
        return true;
    }

    clearOAuthParamsFromUrl();
    return completeGoogleAuthResult({ idToken, state, error });
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

    startAppButton.disabled = !isSignedIn;
    startAppButton.querySelector(".buttonLabel").textContent = isSignedIn ? "Start" : "Sign in to start";
}

function onSignIn(name) {
    document.getElementById("nameText").textContent = name;
    setSignedInAppButtons(true);
    hideSignInControls();
    updateAuthActionButton(true);
    document.getElementById("speechStatus").textContent = `Signed in as ${name}.`;
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
    document.getElementById("speechStatus").textContent = "Signed out.";
}

function initGoogleSignIn() {
    if (window.location.protocol === "file:") {
        console.error(
            "Google Sign-In requires http://localhost — open the page with a local server, not as a file."
        );
        return;
    }

    if (!window.google?.accounts?.id) {
        return;
    }

    google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        ux_mode: "popup",
        auto_select: false,
        use_fedcm_for_button: false,
    });
    if (!needsRedirectSignIn()) {
        renderGisOverlayButton();
    }
    demoteGoogleIframes();
    new MutationObserver(demoteGoogleIframes).observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
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
        showSettings(settingsButton);
    });

    const startAppButton = document.getElementById("startAppButton");
    startAppButton.addEventListener("click", function () {
        if (startAppButton.disabled) return;
        document.getElementById("introContainer").style.display = 'none';
        document.getElementById("translationContainer").style.display = 'flex';
        document.getElementById("startButton").focus();
        document.getElementById("speechStatus").textContent = "Translation view.";
    });

    document.getElementById("signInButton").addEventListener("click", startGoogleSignIn);
    window.addEventListener("message", (event) => {
        if (event.origin !== window.location.origin || event.data?.type !== "layho-google-auth") {
            return;
        }
        completeGoogleAuthResult(event.data);
    });
    checkSignedIn();
});
