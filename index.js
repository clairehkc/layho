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
            document.getElementById("signInButton").style.display = 'flex';
        }

        return apiKey;
    } catch (error) {
        console.error(error.message);
    }
}

function handleCredentialResponse(response) {
    setSignInCookie(response.credential);
    fetchApiKey(response.credential);
    document.getElementById("signInButton").style.display = 'none';
    document.getElementById("signOutButton").style.display = 'flex';
}

function checkSignedIn() {
    const savedToken = getSignInCookie();

    if (savedToken) {
        fetchApiKey(savedToken);
    } else {
        document.getElementById("signInButton").style.display = 'flex';
    }
}

function onSignIn(name) {
    document.getElementById("nameText").textContent = name;
    document.getElementById("startAppButton").disabled = false;
    document.getElementById("signOutButton").style.display = 'flex';
}

function onSignOut() {
    clearSignInCookie();
    if (window.google?.accounts?.id) {
        google.accounts.id.disableAutoSelect();
    }
    apiKey = undefined;
    document.getElementById("signOutButton").style.display = 'none';
    document.getElementById("signInButton").style.display = 'flex';
    document.getElementById("nameText").textContent = "";
    document.getElementById("startAppButton").disabled = true;
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

