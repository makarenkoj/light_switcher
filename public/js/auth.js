"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem('token');

  if (token) {
    window.location.href = '/';
    return;
  };

  localStorage.removeItem('phoneNumber');
  localStorage.removeItem('phoneCodeHash');
  localStorage.removeItem('step');
  localStorage.removeItem('authorized');

  const signUpForm  = document.getElementById("sign-up-form")
  if (signUpForm) {
    signUpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const phone = document.getElementById("phone").value;
      const password = document.getElementById("password").value;

      try {
        const response = await fetch("/admin/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, phoneNumber: phone, password: password }),
        });

        const data = await response.json();
        console.log('DATA:', data);

        if (response.ok) {
          localStorage.setItem('userId', data.userId);
          document.getElementById("message").innerText = data.message;
        } else {
          document.getElementById("message").innerText = data.error;
          throw new Error(data.error)
        }

      } catch (error) {
        alert(error.message);
      }
    });
  }
});
