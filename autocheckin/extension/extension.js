// background.js

// Function to open a new tab with the API URL
function openAPITab(token) {
    const apiUrl = 'https://checkout.ac/auto/c/' + token;
    chrome.tabs.create({ url: apiUrl });
} 

// Event listener for when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    // Check if the user is on the desired website
    if (tab.url.includes('checkin.york.ac.uk/selfregistration')) {
        // Get the token from the cookie
        chrome.cookies.get({ url: 'https://checkin.york.ac.uk/selfregistration', name: 'prestostudent_session' }, function(cookie) {
            if (cookie) {
                // Send token to API
                openAPITab(cookie.value);
            } else {
                console.error('Token cookie not found');
            }
        });
    } else {
        // Redirect user to the desired website
        chrome.tabs.create({ url: 'https://checkin.york.ac.uk/' });
    }
});
