document.addEventListener("DOMContentLoaded", () => {
  applyTranslations();

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      localStorage.setItem("lang", lang);
      applyTranslations();
    });
  });
});
