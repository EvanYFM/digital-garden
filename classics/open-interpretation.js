if (new URLSearchParams(location.search).get('view') === 'interpretation') {
  const reading = document.querySelector('.chapter.active .interpretation, .sheet.active .interpretation');
  if (reading) {
    const toolbar = document.querySelector('.toolbar');
    reading.style.scrollMarginTop = Math.max(0, toolbar?.getBoundingClientRect().bottom ?? 0) + 16 + 'px';
    reading.setAttribute('tabindex', '-1');
    reading.focus({preventScroll: true});
    reading.scrollIntoView({block: 'start', behavior: 'instant'});
  }
}
