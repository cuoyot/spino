// Keep the original controls in one shared strip beneath the fixed app header.
export function mountPageNavigation(page) {
  let navigation = page.querySelector(':scope > .cp-library-navigation');
  if (navigation) {
    navigation.classList.add('cp-page-navigation');
    navigation.querySelector('.cp-section-tabs').classList.add('cp-navigation-bar', 'cp-navigation-tabs');
  } else {
    const controls = page.querySelector('.cp-content > .cp-agenda-toolbar, .cp-progress-page > .cp-progress-sections');
    if (!controls) return;
    navigation = document.createElement('div');
    navigation.className = 'cp-page-navigation';
    controls.classList.add('cp-navigation-bar');
    if (controls.matches('.cp-agenda-toolbar')) {
      controls.classList.add('cp-navigation-toolbar');
      controls.querySelector('.cp-choice-group').classList.add('cp-navigation-tabs');
    } else controls.classList.add('cp-navigation-tabs');
    navigation.append(controls);
    page.prepend(navigation);
  }
  const header = page.parentElement.querySelector(':scope > .cp-app-header');
  const update = () => {
    const leadingSpace = parseFloat(getComputedStyle(page).getPropertyValue('--cp-page-top-space')) || 0;
    const coverage = leadingSpace > 0 ? Math.min(1, Math.max(0, page.scrollTop / leadingSpace)) : 1;
    navigation.style.setProperty('--cp-navigation-coverage', coverage.toFixed(3));
    const docked = coverage === 1;
    navigation.classList.toggle('is-docked', docked);
    header.classList.toggle('has-docked-navigation', docked);
  };
  page.addEventListener('scroll', update, {passive: true});
  update();
}
