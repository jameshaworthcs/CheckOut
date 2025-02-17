document.querySelectorAll('.accordion-header').forEach((header) => {
  header.addEventListener('click', () => {
    const section = header.parentElement.parentElement;
    const currentlyActiveAccordion = section.querySelector('.accordion.active');
    const clickedAccordion = header.parentElement;

    if (currentlyActiveAccordion && currentlyActiveAccordion !== clickedAccordion) {
      currentlyActiveAccordion.classList.remove('active');
      currentlyActiveAccordion.querySelector('.accordion-content').style.maxHeight = 0;
    }

    clickedAccordion.classList.toggle('active');
    const content = clickedAccordion.querySelector('.accordion-content');
    content.style.maxHeight = clickedAccordion.classList.contains('active')
      ? content.scrollHeight + 'px'
      : 0;
  });
});
