const translations = {
  en: {
    title: "Sign Up",
    email: "Email",
    password: "Password",
    submit: "Submit",
    login: "Login",
    signup: "Signup",
    logout: "Logout",
    appName: "Light Switcher Admin Panel",
    noNotifications: "No Notifications",
    telegram_authorization: "Telegram Authorization",
    step1: "Step 1: Enter your phone number",
    step2: "Step 2: Enter the confirmation code"
  },
  ua: {
    title: "Реєстрація",
    email: "Електронна пошта",
    password: "Пароль",
    submit: "Відправити",
    login: "Увійти",
    signup: "Реєстрація",
    logout: "Вийти",
    appName: "Панель адміністратора Light Switcher",
    noNotifications: "Немає сповіщень",
    telegram_authorization: "Авторизація Telegram",
    step1: "Крок 1: Введіть номер телефону",
    step2: "Крок 2: Введіть код підтвердження"
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
