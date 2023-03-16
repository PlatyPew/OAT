document.addEventListener("DOMContentLoaded", function() {
    var passwordForm = document.getElementById('password-form');
    passwordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      var password = document.getElementById('password').value;
      console.log(password);
      chrome.runtime.sendMessage({action: "sendPassword", password: password});

      // Indicate success
      document.getElementById('message').innerHTML = "Password captured!";
    });
});