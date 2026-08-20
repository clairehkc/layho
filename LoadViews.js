async function loadHtml(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    return response.text();
}

const viewsReady = (async function loadViews() {
    const speechStatus = document.getElementById("speechStatus");
    const [settingsHtml, signUpHtml, translationHtml] = await Promise.all([
        loadHtml("settings.html"),
        loadHtml("sign-up.html"),
        loadHtml("translation.html"),
    ]);
    speechStatus.insertAdjacentHTML("beforebegin", settingsHtml);
    speechStatus.insertAdjacentHTML("beforebegin", signUpHtml);
    speechStatus.insertAdjacentHTML("beforebegin", translationHtml);
})();

function whenViewsReady(callback) {
    const run = () => viewsReady.then(callback);
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run);
    } else {
        run();
    }
}

function setBackgroundInert(isInert) {
    ["introContainer", "translationContainer"].forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
            element.inert = isInert;
        }
    });
}
