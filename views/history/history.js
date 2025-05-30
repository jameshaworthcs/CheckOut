function showLoadingOverlay(duration) {
  const overlay = document.getElementById('loading-overlay');
  const clipRect = document.getElementById('clip-rect');
  const spinner = document.getElementById('loading-spinner');

  overlay.style.visibility = 'visible';
  overlay.style.opacity = '1';

  clipRect.setAttribute('width', '0');

  let startTime = null;
  let animationCompleted = false;

  function animateReveal(time) {
    if (!startTime) startTime = time;
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    clipRect.setAttribute('width', `${progress * 100}%`);

    if (progress < 1) {
      requestAnimationFrame(animateReveal);
    } else {
      animationCompleted = true;
      if (window.overlayDone) {
        removeOverlay();
      } else {
        spinner.style.display = 'block';
      }
    }
  }

  requestAnimationFrame(animateReveal);

  window.endLoadingOverlay = function () {
    window.overlayDone = true;
    if (animationCompleted) {
      removeOverlay();
    }
  };

  function removeOverlay() {
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
    clipRect.setAttribute('width', '0');
    spinner.style.display = 'none';
    window.overlayDone = false;
    animationCompleted = false;
  }

  window.overlayDone = false;
}

// Use skeleton instead for less intrusive initial load
//showLoadingOverlay(300);

let currentOffset = 0;
const ITEMS_PER_PAGE = 10;

/**
 * Fetches history data from the API and renders code records along with statistics.
 *
 * This function retrieves data from the `/api/history/history` endpoint using the global pagination parameters. It processes
 * the fetched JSON data to update the DOM element with the ID "activeClasses" by displaying a summary of statistics (total codes,
 * different IPs, device IDs, and user accounts) and individual code details. If the `append` flag is false, the function resets
 * the global offset and overwrites the container's content. Otherwise, it appends additional code records to the existing content.
 *
 * For each code record, the function creates HTML elements that display the check-in code, date, module information, and additional
 * details, as well as buttons for copying the code and toggling its visibility. A "Load More" button is added if more items are available,
 * and clicking it increases the offset and recursively fetches additional data.
 *
 * Additionally, if a global function `window.endLoadingOverlay` is defined, it is invoked after the data is successfully rendered.
 * Errors during the fetch operation are caught and logged to the console.
 *
 * @param {boolean} [append=false] - Indicates whether to append new data to the existing content (true) or reset and replace it (false).
 */
function fetchDataAndRender(append = false) {
  if (!append) {
    currentOffset = 0;
  }

  fetch(`/api/history/history?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`)
    .then((response) => response.json())
    .then((data) => {
      const pastCodes = data.pastCodes;
      const stats = data.stats;
      const pagination = data.pagination;
      const container = document.getElementById('activeClasses');
      const ipCount = Object.keys(stats.ipCounts).length;
      const ipCountText = ipCount === 1 ? 'IP address' : 'IP addresses';
      const deviceCount = Object.keys(stats.deviceIDCounts).length;
      const deviceCountText = deviceCount === 1 ? 'device' : 'devices';
      const userCount = Object.keys(stats.usernameCounts).length;
      const userCountText = userCount === 1 ? 'account' : 'accounts';
      const totalCount = stats.totalCount;
      const totalCountText = totalCount === 1 ? 'code' : 'codes';

      if (!append) {
        container.innerHTML = `
                <p>${totalCount} ${totalCountText} found, from ${ipCount} ${ipCountText}, ${deviceCount} ${deviceCountText}, and ${userCount} ${userCountText}.</p>
            `;
      }

      // Remove existing load more button if it exists
      const existingLoadMore = document.getElementById('load-more-btn');
      if (existingLoadMore) {
        existingLoadMore.remove();
      }

      pastCodes.forEach((item) => {
        const codeDay = new Date(item.codeDay).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const div = document.createElement('div');
        div.classList.add('sessionOption');
        div.setAttribute('data-module', item.md);
        div.setAttribute('data-checkinCode', item.checkinCode);
        div.innerHTML = `
              <div class="toprowdiv">
                <p class="toprowclass">${item.checkinCode}</p>
                <p class="sessionInfo toprowclass" style="text-align:right;">${codeDay}<br>${item.md}</p>
              </div>
              <p class="codeInfo">${item.inst}-${item.crs}-${item.yr}-${item.groupCode}-${item.codeID}</p>
              <p class="codeInfo">Source: ${item.source}</p>
              <div class="button-container">
                  <button onclick="copyText('${item.checkinCode}')" class="share-button">Copy</button>
                  ${
                    item.visState === '0'
                      ? `<button onclick="visible('${item.tk}', '1')" class="share-button">Redo/Show</button>`
                      : `<button onclick="visible('${item.tk}', '0')" class="share-button hide">Undo</button>`
                  }
              </div>
              ${item.codeState === '0' ? `<h4>⚠️ Code is blocked. Reason: ${item.codeDesc}</h4>` : ''}
              ${item.visState === '0' ? `<h4>⚠️ This code is hidden.</h4>` : ''}
            `;

        container.appendChild(div);
      });

      // Add load more button if there are more items
      if (pagination.hasMore) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'load-more-btn';
        loadMoreBtn.className = 'load-more-button';
        loadMoreBtn.textContent = 'Load More';
        loadMoreBtn.onclick = () => {
          currentOffset += ITEMS_PER_PAGE;
          fetchDataAndRender(true);
        };
        container.appendChild(loadMoreBtn);
      }

      if (typeof window.endLoadingOverlay === 'function') {
        window.endLoadingOverlay();
      }
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
    });
}

// Call the function on page load
window.onload = () => fetchDataAndRender(false);

// function showBanner(message, type, duration = 5000) {
//     if (type) {
//         backgroundColor = 'lightgreen';
//     } else {
//         backgroundColor = '#C83F49'
//     }
//     var banner = $('<div class="result-banner"></div>');
//     banner.css({
//         'background-color': backgroundColor,
//         'color': 'black',
//         'position': 'fixed',
//         'top': '0',
//         'left': '0',
//         'width': '100%',
//         'padding': '10px',
//         'text-align': 'center',
//         'z-index': '9999',
//         'display': 'none'
//     }).text(message);
//     $('body').append(banner);
//     banner.fadeIn();
//     setTimeout(function () {
//         banner.fadeOut(function () {
//             banner.remove();
//         });
//     }, duration);
// }

function copyText(textToCopy) {
  // Create a temporary textarea element to perform the copy
  var tempTextarea = document.createElement('textarea');
  tempTextarea.value = textToCopy;

  // Append the textarea to the document
  document.body.appendChild(tempTextarea);

  // Select the text inside the textarea
  tempTextarea.select();
  tempTextarea.setSelectionRange(0, 99999); // For mobile devices

  // Execute the copy command
  document.execCommand('copy');

  // Remove the temporary textarea
  document.body.removeChild(tempTextarea);

  // Display the copy confirmation message
  var msg = 'Copied ' + textToCopy;
  // showBanner(msg, true)
  displayNotice(msg, 'success', 'Copied!', 3000);
}

function visible(tk, vis) {
  // Get the button that was clicked
  const button = event.currentTarget;
  const originalText = button.innerHTML;

  // Set fixed dimensions to prevent button resizing
  const originalWidth = button.offsetWidth;
  const originalHeight = button.offsetHeight;
  button.style.width = `${originalWidth}px`;
  button.style.height = `${originalHeight}px`;

  // Add spinner
  button.innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';
  button.disabled = true;

  const url = `/api/app/visibility/${vis}`;
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tk }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to change visibility of submission');
      }
      return response.json();
    })
    .then((data) => {
      const { success, msg } = data;
      if (success) {
        displayNotice(msg, 'success');
        fetchDataAndRender();
      } else {
        // Restore button state on error
        button.innerHTML = originalText;
        button.disabled = false;
        button.style.width = '';
        button.style.height = '';
        displayNotice(msg, 'error');
      }
    })
    .catch((error) => {
      // Restore button state on error
      button.innerHTML = originalText;
      button.disabled = false;
      button.style.width = '';
      button.style.height = '';
      displayNotice(error.message, 'error');
    });
}
