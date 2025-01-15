document.addEventListener('DOMContentLoaded', function () {

    // Fungsi untuk menampilkan overlay dan pop-up berdasarkan kondisi
    function showPopup(type) {
        const overlay = document.querySelector('.overlay');
        const popups = {
            "verified": document.getElementById('pop-up-verified'),
            "doc_not_verified": document.getElementById('pop-up-doc-not-verified'),
            "sig_not_verified": document.getElementById('pop-up-sig-not-verified'),
            "both_not_verified": document.getElementById('pop-up-both-not-verified'),
            "no_qr": document.getElementById('pop-up-no-qr-code'),
            "missing_input": document.getElementById('pop-up-missing-input')
        };

        overlay.style.display = 'block';
        if (popups[type]) {
            popups[type].classList.add('show');
        }
    }

    // Fungsi untuk menyembunyikan overlay dan semua pop-up
    function hideAllPopups() {
        const overlay = document.querySelector('.overlay');
        overlay.style.display = 'none';
        document.querySelectorAll('.pop-up').forEach(popup => {
            popup.classList.remove('show');
        });
    }

    // Event listener untuk tombol "Back" di setiap pop-up
    const backPopupButtons = document.querySelectorAll('.backPopup');
    backPopupButtons.forEach(button => {
        button.addEventListener('click', hideAllPopups);
    });

    // Fungsi untuk menangani klik tombol "CHECK"
    function handleCheckButtonClick() {
        const noSuratInput = document.getElementById('no_surat').value;
        const suratInput = document.getElementById('surat').files[0];

        // Periksa apakah input tidak kosong
        if (!noSuratInput || !suratInput) {
            showPopup("missing_input");
            return;
        }

        const formData = new FormData();
        formData.append('no_surat', noSuratInput);
        formData.append('surat', suratInput);

        const loading = document.getElementById('loading');

        // Cegah loading spinner bertumpuk
        if (!loading.classList.contains('hidden')) {
            return; // Jika loading sudah ditampilkan, jangan lakukan apa-apa
        }

        loading.classList.remove('hidden'); // Tampilkan animasi loading

        fetch('/check_sign', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            loading.classList.add('hidden'); // Sembunyikan loading

            // Tampilkan pop-up yang sesuai
            if (data.noQRCode) {
                showPopup("no_qr");
            } else if (data.SignatureValid && data.DocumentValid) {
                showPopup("verified");
            } else if (data.SignatureValid && !data.DocumentValid) {
                showPopup("doc_not_verified");
            } else if (!data.SignatureValid && data.DocumentValid) {
                showPopup("sig_not_verified");
            } else {
                showPopup("both_not_verified");
            }
        })
        .catch(error => {
            loading.classList.add('hidden'); // Sembunyikan loading jika terjadi error
            console.error('Error:', error);
        });
    }

    // Pasangkan event listener pada tombol "CHECK"
    const checkButton = document.getElementById('checkButton');
    checkButton.addEventListener('click', handleCheckButtonClick);
});
