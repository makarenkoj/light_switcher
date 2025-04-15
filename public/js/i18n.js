const translations = {
  en: {
    title: "Sign Up",
    email: "Email",
    password: "Password",
    submit: "Submit",
    login: "Login",
    signup: "Signup",
    logout: "Logout",
    appName: "Light Switcher Admin Panel"
  },
  ua: {
    title: "Реєстрація",
    email: "Електронна пошта",
    password: "Пароль",
    submit: "Відправити",
    login: "Увійти",
    signup: "Реєстрація",
    logout: "Вийти",
    appName: "Панель адміністратора Light Switcher"
  }
};

function t(key) {
  const lang = localStorage.getItem("lang") || "en";
  return translations[lang][key] || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = t(key);
    } else {
      el.innerText = t(key);
    }
  });
}
