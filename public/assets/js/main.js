(function () {

    /*=====================================
    Sticky
    ======================================= */
    window.onscroll = function () {
        var header_navbar = document.querySelector(".navbar-area");
        var sticky = header_navbar.offsetTop;

        if (window.pageYOffset > sticky) {
            header_navbar.classList.add("sticky");
        } else {
            header_navbar.classList.remove("sticky");
        }



        // show or hide the back-top-top button
        var backToTo = document.querySelector(".scroll-top");
        if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
            backToTo.style.display = "flex";
        } else {
            backToTo.style.display = "none";
        }
    };

    // section menu active
function onScroll(event) {
    var sections = document.querySelectorAll('.page-scroll');
    var scrollPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;

    for (var i = 0; i < sections.length; i++) {
        var currLink = sections[i];
        var val = currLink.getAttribute('href');

        // Check if val exists and is a valid selector
        if (!val || val.charAt(0) !== '#') {
            continue; // Skip this iteration if val is not a valid selector
        }

        var refElement = document.querySelector(val);

        // Check if refElement belongs to the iframe
        if (refElement && refElement.closest('#myIframe')) {
            continue; // Skip this iteration if refElement belongs to the iframe
        }

        var scrollTopMinus = scrollPos + 73;
        if (refElement && refElement.offsetTop <= scrollTopMinus && (refElement.offsetTop + refElement.offsetHeight > scrollTopMinus)) {
            document.querySelector('.page-scroll').classList.remove('active');
            currLink.classList.add('active');
        } else {
            currLink.classList.remove('active');
        }
    }
};



    window.document.addEventListener('scroll', onScroll);
    
    // for menu scroll 
    var pageLink = document.querySelectorAll('.page-scroll');

    pageLink.forEach(elem => {
        elem.addEventListener('click', e => {
            const hrefValue = elem.getAttribute('href');
            
            // Check if hrefValue starts with 'http', indicating it's a URL
            if (hrefValue.startsWith('http')) {
                window.location.href = hrefValue; // Go to the URL
            } else {
                e.preventDefault();
                // Query the document for the element and perform smooth scroll
                const scrollToElement = document.querySelector(hrefValue);
                if (scrollToElement) {
                    scrollToElement.scrollIntoView({
                        behavior: 'smooth',
                        offsetTop: 1 - 60,
                    });
                }
            }
        });
    });

    "use strict";

}) ();

