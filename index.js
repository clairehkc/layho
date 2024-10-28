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

        console.log("res", json);
        if (json.statusCode === 200) {
            onSignIn(json.body.name);
            apiKey = json.body.key;
        }

        return apiKey;
    } catch (error) {
        console.error(error.message);
    }
}

function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    document.cookie = `${signInCookieName}=${response.credential}; SameSite=None; Secure`;
    fetchApiKey(response.credential);
    document.getElementById("signInButton").style.display = 'none';
    document.getElementById("signOutButton").style.display = 'flex';
}

function checkSignedIn() {
    const savedToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${signInCookieName}=`))
        ?.split("=")[1];
    console.log("savedToken", savedToken);
    if (savedToken) {
        fetchApiKey(savedToken);
    } else {
        document.getElementById("signInButton").style.display = 'flex';
    }    
}

function onSignIn(name) {
    document.getElementById("nameText").innerHTML = name;
    // document.getElementById("content").style.display = 'block';
    document.getElementById("settingsStartContainer").style.visibility = 'visible';
    document.getElementById("signOutButton").style.display = 'flex';
}

function onSignOut() {
    document.cookie = `${signInCookieName}=; SameSite=None; Secure`;
    apiKey = undefined;
    document.getElementById("signOutButton").style.display = 'none';
    document.getElementById("signInButton").style.display = 'flex';
    document.getElementById("nameText").innerHTML = "";
    document.getElementById("settingsStartContainer").style.visibility = 'hidden';
}

window.onload = function () {
    const client_id = "699001412765-r6d8ck46h18u9uk7b4dlddncospqcci1.apps.googleusercontent.com";

    google.accounts.id.initialize({
        client_id,
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("signInButton"),
        { theme: "outline", size: "large" }  // customization attributes
    );

    const signOutButton = document.getElementById('signOutButton');
    signOutButton.onclick = () => {
        onSignOut();
    };

    checkSignedIn();
}

function showSettings() {

}

function hideSettings() {

}

const settingsButton = document.getElementById("settingsButton");
settingsButton.onclick = () => {
    showSettings();
};
