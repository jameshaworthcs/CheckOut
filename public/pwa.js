document.addEventListener('DOMContentLoaded', function () {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
  
    if (isIOS && !isInStandaloneMode && !hasSeenOverlayToday()) {
      const overlay = document.createElement('div');
      overlay.classList.add('overlay');
  
      overlay.innerHTML = `
        <div class="overlay-content">
          <h2>Welcome to Check out!</h2>
          <p>To enjoy the best experience, add this website to your home screen:</p>
          <div class="overlay-instructions">
          <span>1. </span><img src="/share.png" alt="Share icon" width="30" height="30">
            <span>Tap the <strong>Share</strong> icon</span>
            <br><br>
            <span>2. Tap <strong>Add to Home Screen</strong></span>
          </div>
          <button class="dismiss-button" onclick="dismissOverlay()">Got it!</button>
        </div>
      `;
  
      document.body.appendChild(overlay);
      overlay.style.display = 'flex';
    }
  });
  
  function dismissOverlay() {
    const overlay = document.querySelector('.overlay');
    overlay.style.display = 'none';
    markOverlayAsSeen();
  }
  
  function hasSeenOverlayToday() {
    const lastSeenDate = getCookie('lastSeenDate');
    if (lastSeenDate) {
      const today = new Date().toDateString();
      console.log(today)
      return today === new Date(lastSeenDate).toDateString();
    }
    return false;
  }
  
  function markOverlayAsSeen() {
    const oneHour = 1 / 24; // 1 hour in days
    const expires = new Date();
    expires.setTime(expires.getTime() + oneHour * 60 * 60 * 1000);
    setCookie('lastSeenDate', expires.toUTCString(), oneHour);
  }
  
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }
  
  function getCookie(name) {
    const match = document.cookie.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
  }
  