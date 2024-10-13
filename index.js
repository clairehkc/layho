const signInCookieName = "layho_jwt";

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
        apiKey = json.body.key;
        console.log("res", json);
    } catch (error) {
        console.error(error.message);
    }
}

function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    document.cookie = `${signInCookieName}=${response.credential}; SameSite=None; Secure`;
    fetchApiKey(response.credential);
}

function checkSignedIn() {
    const savedToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${signInCookieName}=`))
        ?.split("=")[1];
    console.log("savedToken", savedToken);
    if (savedToken) fetchApiKey(savedToken);
}

function signOut() {
    document.cookie = `${signInCookieName}=; SameSite=None; Secure`;
    apiKey = undefined;
}

window.onload = function () {
    const client_id = "699001412765-r6d8ck46h18u9uk7b4dlddncospqcci1.apps.googleusercontent.com";

    google.accounts.id.initialize({
        client_id,
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("buttonDiv"),
        { theme: "outline", size: "large" }  // customization attributes
    );

    const signOutButton = document.getElementById('signOutButton');
    signOutButton.onclick = () => {
        signOut();
    };

    checkSignedIn();
}
