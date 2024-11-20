(function() {
    const targetDomain = 'checkin.york.ac.uk/selfregistration';
    const cookieName = 'prestostudent_session';
    
    // Check if the current page matches the target domain
    if (window.location.href.includes(targetDomain)) {
        // Get the cookie value
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith(cookieName + '='))
            ?.split('=')[1];
        
        if (cookieValue) {
            // Open the API tab with the token //
            const apiUrl = 'https://checkout.ac/auto/c/' + cookieValue;
            window.open(apiUrl, '_blank');
        } else {
            alert('Token cookie not found');
        }
    } else {
        // Redirect to the correct site
        window.location.href = 'https://checkin.york.ac.uk/';
    }
})();
