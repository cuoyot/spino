// The page's leading space scrolls away before its tabs join the fixed app header.
export function bindLibraryNavigation(page) {
  const navigation = page.querySelector(':scope > .cp-library-navigation');
  if (!navigation) return;
  const header = page.parentElement.querySelector(':scope > .cp-app-header');
  const update = () => {
    const leadingSpace = parseFloat(getComputedStyle(page).getPropertyValue('--cp-page-top-space')) || 0;
    const docked = page.scrollTop >= leadingSpace;
    navigation.classList.toggle('is-docked', docked);
    header.classList.toggle('has-docked-library', docked);
  };
  page.addEventListener('scroll', update, {passive: true});
  update();
}
