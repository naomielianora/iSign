document.addEventListener('DOMContentLoaded', function () {
    //ambil password yang diinput user
    let passwordInput = document.getElementById('password');
    let confirmPasswordInput = document.getElementById('confirm_password');

    //untuk memeriksa apakah user telah menginput password dengan benar
    passwordInput.addEventListener('input', function () {
      let password = passwordInput.value;
      let passwordWarning = document.getElementById('password_notvalid');

      // Aturan validasi password
      let minLength = password.length >= 8; // Panjang minimum 8 karakter
      let hasUppercase = /[A-Z]/.test(password); // Harus ada huruf besar
      let hasLowercase = /[a-z]/.test(password); // Harus ada huruf kecil
      let hasNumber = /[0-9]/.test(password); // Harus ada angka

      // Jika password memenuhi semua aturan
      if (minLength && hasUppercase && hasLowercase && hasNumber) {
          passwordWarning.classList.add("hidden");
      } 
      // Jika password tidak valid, tampilkan warning
      else {
          passwordWarning.classList.remove("hidden");
      }
    });

    //untuk memeriksa apakah user telah memasukan password yang sama pada text box "confirm password"
    confirmPasswordInput.addEventListener('input', function () {
        let password = passwordInput.value;
        let confirmPassword = confirmPasswordInput.value;
        let passwordWarning = document.getElementById('password_warning');

        //jika tidak sama, maka munculkan pesan warning, dan jadikan text input menjadi merah (invalid)
        if (password !== confirmPassword) {
            passwordWarning.classList.remove("hidden");
        } 
        //jika sudah sama, maka hilangkan pesan warning, dan jadikan text input menjadi hijau (valid)
        else {
            passwordWarning.classList.add("hidden");
        }
    });

    //ambil email yang diinput user
    let emailInput = document.getElementById('email');
    //untuk mengecek apakah email yang diinput oleh user belum terdaftar di database
    //menggunakan fecth API sehingga user tidak perlu submit terlebih dahulu untuk mengetahui
    emailInput.addEventListener('input', function () {
      let emailInput = this.value;
      checkEmailAvailability(emailInput);
    });

    let submitButton = document.getElementById('submit_button');

    submitButton.addEventListener('click', function (event) {
        //jika ada input yg tidak valid
        if (!checkAllFieldsValid()) {
        event.preventDefault(); //jangan submit isi form
        //tampilkan error message
        let submit_warning = document.getElementById('submit_warning');
        submit_warning.classList.remove('hidden');
        }
    });
});

//mengirim email yg diinput ke server (index.js)
async function checkEmailAvailability(inputed_email) {
  try {
    const response = await fetch(`/check_email?inputed_email=${encodeURIComponent(inputed_email)}`);
    
    if (response.ok) {
      const responseData = await response.json();
      let isValidEmail = validateEmail(inputed_email);
      updateEmailInput(responseData.taken === false, isValidEmail);
    } else {
      console.error('Network response was not ok:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

//untuk mengecek apakah benar" email yg diinput
function validateEmail(email) {
  //menggunakan regex untuk mengecek apakah email yg diinput sesuai dengan pattern sebuah email
  let emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  return emailPattern.test(email);
}

function updateEmailInput(emailAvailable, isValidEmail) {
  let emailWarning_taken = document.getElementById('email_warning_taken');
  let emailWarning_notvalid = document.getElementById('email_warning_notvalid');
  emailWarning_taken.classList.add("hidden");
  emailWarning_notvalid.classList.add("hidden");

  //jika email tidak unik, maka munculkan warning
  if (!emailAvailable) {
    emailWarning_taken.classList.remove("hidden");
  }
  //jika email tidak valid, maka munculkan warning
  if (!isValidEmail) {
    emailWarning_notvalid.classList.remove("hidden");
  }
}

//untuk mengecek apakah semua input sudah valid
function checkAllFieldsValid() {
  const warnings = document.querySelectorAll('.warning');
    for (let i = 0; i < warnings.length; i++) {
        //untuk warning di bawah tombol submit jangan dicek
        if (warnings[i].id === 'submit_warning') {
            continue;
        }
        if (!warnings[i].classList.contains('hidden')) {
            return false; //ada warning yang blm resolved
        }
    }
    return true; //semua input sudah valid, user dapat didaftarkan
}



  