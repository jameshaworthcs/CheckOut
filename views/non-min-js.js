// FAQ and Terms Link
document.addEventListener("DOMContentLoaded", function () {
    // Create a link element
    var link = document.createElement("a");
    link.id = "fixed-link";
    link.href = "/terms"; // Replace with your desired link URL
    link.innerHTML = "Terms";
    link.style.marginLeft = "15px";
    link.style.paddingLeft = "0px";
    var link2 = document.createElement("a");
    link2.id = "fixed-link";
    link2.href = "/faq"; // Replace with your desired link URL
    link2.innerHTML = "FAQ";
    link2.style.marginRight = "51px";
    link2.style.paddingRight = "9px";

    // Append the links to the body
    document.body.appendChild(link);
    document.body.appendChild(link2);

    // Show the link after a delay (you can customize the delay)
    setTimeout(function () {
        link.style.display = "block";
        link2.style.display = "block";
    }, 0); // Display link after 2000 milliseconds (2 seconds)
});


// New table code
// Get the table body element
var tableBody = $('#table-body');

// Check if the fetched JSON is empty
if (<%- classData.length %> === 0) {
  // Remove the table
  tableBody.closest('table').remove();

  // Display a message
  $('#message-container').text('No check-out has been submitted for this activity yet.');
} else {
  // Loop through the data array
  <% classData.forEach(function (row) { %>
    // Create a new table row element
    var tr = $('<tr></tr>');
    <% var repeatVerifiedHtml = include('../views/repeatVerified'); %>
    // Append table cells with log rows
    tr.append($('<td></td>').html('<%- row.groupCode.replace(/VFD/g, repeatVerifiedHtml) %>'));
    tr.append($('<td style="letter-spacing:2px;"></td>').text('<%- row.checkinCode %>'));

    // Create a "Copy" button and add a click event listener
    var copyButton = $('<button class="share-button">Copy</button>');
    copyButton.click(function () {
      copyText('<%- row.checkinCode %>');
    });

    // Append the "Copy" button to the row
    tr.append($('<td></td>').append(copyButton));

    // Append the table row to the table body
    tableBody.append(tr);
  <% }); %>
}

// Table Code using /classdata/* OLD CODE
$.get('/classdata/<%= md %>', function (data) {
    // Get the table body element
    var tableBody = $('#table-body');

    // Check if the fetched JSON is empty
    if (data.length === 0) {
        // Remove the table
        tableBody.closest('table').remove();

        // Display a message
        $('#message-container').text('No check-out has been submitted for this activity yet.');
        return;
    }

    // Loop through the data array
    data.forEach(function (row) {
        // Create a new table row element
        var tr = $('<tr></tr>');
        
        // Append table cells with log rows
        tr.append($('<td></td>').html(row.groupCode.replace(/VFD/g, '<%- include('../views/repeatVerified'); %>')));

        tr.append($('<td style="letter-spacing:2px;"></td>').text(row.checkinCode));

        // Create a "Copy" button and add a click event listener
        var copyButton = $('<button class="share-button">Copy</button>');
        copyButton.click(function () {
            copyText(row.checkinCode);
        });

        // Append the "Copy" button to the row
        tr.append($('<td></td>').append(copyButton));

        // Append the table row to the table body
        tableBody.append(tr);
    });
});


// Copy text (Put in table code)
function copyText(textToCopy) {
// Create a temporary textarea element to perform the copy
var tempTextarea = document.createElement("textarea");
tempTextarea.value = textToCopy;

// Append the textarea to the document
document.body.appendChild(tempTextarea);

// Select the text inside the textarea
tempTextarea.select();
tempTextarea.setSelectionRange(0, 99999); // For mobile devices

// Execute the copy command
document.execCommand("copy");

// Remove the temporary textarea
document.body.removeChild(tempTextarea);

// Display the copy confirmation message
var copyConfirmation = $('<div class="copy-confirmation">Copied!</div>');
$('body').append(copyConfirmation);

// Add the 'show' class to make the confirmation visible
copyConfirmation.addClass('show');

// Hide the confirmation message after a short delay
setTimeout(function () {
    // Remove the 'show' class to hide the confirmation
    copyConfirmation.removeClass('show');
    
    // Remove the entire element after the transition
    setTimeout(function () {
        copyConfirmation.remove();
    }, 500); // Adjust the delay to match the transition duration
}, 1500); // Adjust the delay as needed
}

// Share button code
function shareLink() {
    const linkElement = document.querySelector('.shareLink');

    if (navigator.share) {
      // Use the Web Share API if available
      navigator.share({
        title: "The Check-in Website",
        text: "Use this website to share and access the check-out codes.",
        url: linkElement.href,
      })
      .then(() => console.log('Link shared successfully'))
      .catch((error) => console.error('Error sharing link:', error));
    } else {
      // Fallback for browsers that do not support the Web Share API
      alert('Web Share API is not supported on this browser. You can manually copy the link.');
    }
  }

// Navbar active code
// JavaScript code to add "active" class to the current page link
document.addEventListener("DOMContentLoaded", function () {
    var currentUrl = window.location.pathname;
    var navbarLinks = document.getElementById('navbar').getElementsByTagName('a');

    for (var i = 0; i < navbarLinks.length; i++) {
      if (navbarLinks[i].getAttribute('href') === currentUrl) {
        navbarLinks[i].classList.add('active');
      }
    }
  });