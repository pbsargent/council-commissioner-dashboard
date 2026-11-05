((root) => {
  'use strict';
  const pageIdentity = (href, base) => {
    const url = new URL(href, base);
    return url.origin + url.pathname.replace(/\/index\.html$/, '/');
  };
  if (typeof module !== 'undefined') module.exports = {pageIdentity};
  if (!root.document) return;
  const document = root.document;
  const navigation = document.querySelector('.commissioner-navigation');
  const menuButton = document.querySelector('.nav-menu-toggle');
  if (!navigation || !menuButton) return;

  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  };
  const currentPage = pageIdentity(root.location.href, document.baseURI);
  const pageLinks = [...navigation.querySelectorAll('a[href]')];
  pageLinks.forEach(link => {
    const active = pageIdentity(link.href, document.baseURI) === currentPage;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    link.addEventListener('click', closeMenu);
  });

  const localNavigation = document.querySelector('.overview-section-nav');
  const sectionLinks = localNavigation ? [...localNavigation.querySelectorAll('a[href^="#"]')] : [];
  const sections = sectionLinks.map(link => ({link, section:document.getElementById(link.getAttribute('href').slice(1))})).filter(item => item.section);
  const setActiveSection = activeLink => {
    sectionLinks.forEach(link => {
      const active = link === activeLink;
      link.classList.toggle('is-current', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const syncActiveSection = () => {
    const marker = Math.min(220, root.innerHeight * .28);
    let active = null;
    sections.forEach(item => {if (item.section.getBoundingClientRect().top <= marker) active = item;});
    setActiveSection(active ? active.link : null);
  };
  let scheduled = false;
  if (sections.length) root.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    root.requestAnimationFrame(() => {syncActiveSection();scheduled = false;});
  }, {passive:true});
  sectionLinks.forEach(link => link.addEventListener('click', () => setActiveSection(link)));
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  syncActiveSection();
})(typeof window === 'undefined' ? globalThis : window);
