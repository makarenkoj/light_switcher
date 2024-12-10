"use strict";

document.addEventListener("DOMContentLoaded", async (e) => {
  e.preventDefault(); //?
  const token = localStorage.getItem('token');

  try {
    const response = await fetch("/api/telegram/checkSession", {
      method: "GET",
      headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();
    console.log('DATA:', data);

    if (response.ok) {
      localStorage.setItem('authorized', data.authorized);
      document.getElementById("message").innerText = data.message;
    } else {
      localStorage.removeItem('phoneNumber');
      localStorage.removeItem('phoneCodeHash');
      localStorage.setItem('authorized', data.authorized);
      window.location.href = '/'

      document.getElementById("message").innerText = data.error;
      throw new Error(data.error)
    }

  } catch (error) {
    alert(error.message);
  }
});

