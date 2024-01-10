document.addEventListener('DOMContentLoaded', function () {
            
    //ambil pop up verified
    const verifiedPopup = document.getElementById('pop-up-verified');
    //ambil pop up not verified
    const notVerifiedPopup = document.getElementById('pop-up-not-verified');
    //overlay untuk membuat halaman di belakangnya abu saat pop up muncul
    const overlay = document.querySelector('.overlay');
    //ambil button "back" yang ada di pop up
    const verified_backPopupButton = document.getElementById('verified-back');
    const notverified_backPopupButton = document.getElementById('not-verified-back');


    //jika tombol "Back" di klik
    verified_backPopupButton.addEventListener('click', function () {
        console.log("click");
        //hilangkan pop up dan overlay
        overlay.style.display = 'none';
        verifiedPopup.classList.remove('show');
        notVerifiedPopup.classList.remove('show');
    });

    //jika tombol "Back" di klik
    notverified_backPopupButton.addEventListener('click', function () {
        console.log("click");
        //hilangkan pop up dan overlay
        overlay.style.display = 'none';
        verifiedPopup.classList.remove('show');
        notVerifiedPopup.classList.remove('show');
    });

    //ambil button "submit" yang ada di pop up
    const checkButton = document.getElementById('checkButton');

    //jika tombol "submit" di pop up di klik
    checkButton.addEventListener('click', function () {
        const isiQRInput = document.getElementById('isiQR').value;
        const noSuratInput = document.getElementById('no_surat').value;


        //buat sebuah URLSearchParams object yang akan diisi dengan data yang ingin dikirim ke server
        const formData = new URLSearchParams();
        //isi dengan data yang diperlukan
        formData.append('isiQR', isiQRInput);
        formData.append('no_surat', noSuratInput);


        //kirim data ke index.js menggunakan query string
        fetch('/check_sign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            // Check the response and show the appropriate pop-up
            if (data.PopUpValid === true) {
                overlay.style.display = 'block';
                verifiedPopup.classList.add('show');
            } else {
                overlay.style.display = 'block';
                notVerifiedPopup.classList.add('show');
            }
        })
        .catch(error => console.error('Error:', error));
        
    });
});