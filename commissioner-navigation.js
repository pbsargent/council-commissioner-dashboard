(() => {
  const navigation = document.querySelector(".commissioner-navigation");
  const menuButton = document.querySelector(".nav-menu-toggle");
  if (!navigation || !menuButton) return;

  const sectionLinks = [...navigation.querySelectorAll('a[href^="#"]')];
  const sections = sectionLinks
    .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
    .filter((item) => item.section);

  const closeMenu = () => {
    menuButton.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
  };

  const setActive = (activeLink) => {
    sectionLinks.forEach((link) => {
      const active = link === activeLink;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const syncActiveSection = () => {
    const marker = Math.min(220, window.innerHeight * .28);
    let active = sections[0];
    sections.forEach((item) => {
      if (item.section.getBoundingClientRect().top <= marker) active = item;
    });
    if (active) setActive(active.link);
  };

  let scheduled = false;
  window.addEventListener("scroll", () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      syncActiveSection();
      scheduled = false;
    });
  }, { passive: true });

  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(open));
    navigation.classList.toggle("is-open", open);
  });

  sectionLinks.forEach((link) => link.addEventListener("click", () => {
    setActive(link);
    closeMenu();
  }));

  syncActiveSection();
})();
