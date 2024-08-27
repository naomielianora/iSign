document.addEventListener('DOMContentLoaded', function () {
            
    //ambil pop up both verified
    const verifiedPopup = document.getElementById('pop-up-verified');
    //ambil pop up doc not verified
    const doc_notVerifiedPopup = document.getElementById('pop-up-doc-not-verified');
    //ambil pop up sig not verified
    const sig_notVerifiedPopup = document.getElementById('pop-up-sig-not-verified');
    //ambil pop up both not verified
    const both_notVerifiedPopup = document.getElementById('pop-up-both-not-verified');
    //ambil pop up both not verified
    const noQRPopup = document.getElementById('pop-up-no-qr-code');


    //overlay untuk membuat halaman di belakangnya abu saat pop up muncul
    const overlay = document.querySelector('.overlay');

    // Get all buttons with the class 'backPopup'
    const backPopupButtons = document.querySelectorAll('.backPopup');

    // Loop through each button and add an event listener
    backPopupButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Hide the overlay and remove 'show' class from all popups
            overlay.style.display = 'none';
            document.querySelectorAll('.pop-up').forEach(popup => {
                popup.classList.remove('show');
            });
        });
    });

    //ambil button "submit" yang ada di pop up
    const checkButton = document.getElementById('checkButton');

    //jika tombol "submit" di pop up di klik
    checkButton.addEventListener('click', function () {
        const noSuratInput = document.getElementById('no_surat').value;
        const suratInput = document.getElementById('surat').files[0];

        const formData = new FormData();
        formData.append('no_surat', noSuratInput);
        formData.append('surat', suratInput);

        fetch('/check_sign', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.noQRCode) {
                overlay.style.display = 'block';
                noQRPopup.classList.add('show');
            }
            else{
                overlay.style.display = 'block';
                // Check the response and show the appropriate pop-up
                if (data.SignatureValid === true && data.DocumentValid === true) {
                    verifiedPopup.classList.add('show');
                } 
                else if (data.SignatureValid === true && data.DocumentValid === false) {
                    doc_notVerifiedPopup.classList.add('show');
                } 
                else if (data.SignatureValid === false && data.DocumentValid === true) {
                    sig_notVerifiedPopup.classList.add('show');
                }
                else {
                    both_notVerifiedPopup.classList.add('show');
                }
            }
            
        })
        .catch(error => console.error('Error:', error));
        
    });
});