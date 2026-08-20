const signInCookieName = "layho_jwt";
const googleClientId = "699001412765-r6d8ck46h18u9uk7b4dlddncospqcci1.apps.googleusercontent.com";

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

function checkSignedIn() {
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

    checkSignedIn();
});
