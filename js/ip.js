$.getJSON("https://api.ipify.org?format=json", function(data) {
    const ipElement = $("#ip");
    ipElement.html(data.ip);
  
    ipElement.on("click", function() {
        if (submitButton.disabled) {
            showAlert("Oops!", "Please wait a few moments for CAPTCHA to validate you.", "error");
            return;
        }

        inputField.value = data.ip;
        handler(new Event("submit"));
    });

    ipElement.on("touchend", function() {
        setTimeout(() => {
            ipElement.css("color", "white");
        }, 300);
    });
});
