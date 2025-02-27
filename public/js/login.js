"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem('token');

  if (token) {
    window.location.href = '/'
  } else {
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('phoneCodeHash');
    localStorage.removeItem('step');
    localStorage.removeItem('authorized');
  };
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password }),
    });

    const data = await response.json();
    console.log('DATA:', data);

    if (response.ok) {
      localStorage.setItem('token', data.token);
      document.getElementById("message").innerText = data.message;
      window.location.href = '/'
    } else {
      document.getElementById("message").innerText = data.error;
      throw new Error(data.error)
    }

  } catch (error) {
    alert(error.message);
  }
});