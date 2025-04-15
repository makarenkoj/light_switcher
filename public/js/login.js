"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem('token');

  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      localStorage.setItem('lang', lang);
      location.reload();
    });
  });

  if (token) {
    window.location.href = '/';
    return;
  }

  localStorage.removeItem('phoneNumber');
  localStorage.removeItem('phoneCodeHash');
  localStorage.removeItem('step');
  localStorage.removeItem('authorized');

  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const lang = localStorage.getItem('lang') || 'en';

      try {
        const response = await fetch("/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept-Language": lang },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('token', data.token);
          document.getElementById("message").innerText = data.message;
          window.location.href = '/';
        } else {
          document.getElementById("message").innerText = data.error;
          throw new Error(data.error);
        }

      } catch (error) {
        alert(error.message);
      }
    });
  }
});
