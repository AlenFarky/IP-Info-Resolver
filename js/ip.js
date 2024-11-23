$.getJSON("https://api.ipify.org?format=json", function(data) {
    const ipElement = $("#ip");
    ipElement.html(data.ip);
    
    // Dodaj event listener za klik na IP
    ipElement.on('click', function() {
        // Ubaci IP u input polje i pokreni handler
        inputField.value = data.ip;
        handler(new Event('submit'));  // Ručno kreiraj event i proslijedi ga handleru
    });
});
