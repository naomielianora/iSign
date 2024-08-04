document.addEventListener('DOMContentLoaded', function () {
    //ambil password yang diinput user
    let passwordInput = document.getElementById('password');
    let confirmPasswordInput = document.getElementById('confirm_password');

    //untuk memeriksa apakah user telah menginput password
    passwordInput.addEventListener('input', function () {
        let password = passwordInput.value;
        
        //jika sudah diisi, jadikan text input menjadi hijau (valid)
        if (password.length > 0) {
            passwordInput.style.backgroundColor = "green"
        } 
        //jika belum diisi, jadikan text input menjadi merah (invalid)
        else {
            passwordInput.style.backgroundColor = "red"
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
            confirmPasswordInput.style.backgroundColor = "red"
        } 
        //jika sudah sama, maka hilangkan pesan warning, dan jadikan text input menjadi hijau (valid)
        else {
            passwordWarning.classList.add("hidden");
            confirmPasswordInput.style.backgroundColor = "green"
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


    //ambil nama lengkap yang diinput user
    let namalengkapInput = document.getElementById('nama_lengkap');
    //untuk memeriksa apakah user telah menginput nama lengkapnya
    namalengkapInput.addEventListener('input', function () {
        let nama_lengkap = namalengkapInput.value;
        
        //jika sudah diisi, jadikan text input menjadi hijau (valid)
        if (nama_lengkap.length > 0) {
            namalengkapInput.style.backgroundColor = "green"
        } 
        //jika belum diisi, jadikan text input menjadi merah (invalid)
        else {
            namalengkapInput.style.backgroundColor = "red"
        }
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
  let emailInput = document.getElementById('email');
  let emailWarning_taken = document.getElementById('email_warning_taken');
  let emailWarning_notvalid = document.getElementById('email_warning_notvalid');
  emailWarning_taken.classList.add("hidden");
  emailWarning_notvalid.classList.add("hidden");
  //jika email unik & sesuai dengan pattern email, maka text input menjadi hijau (valid)
  if (emailAvailable && isValidEmail) {
      emailInput.style.backgroundColor = "green"

  } else {
      //jika email tidak unik, maka munculkan warning
    if (!emailAvailable) {
      emailWarning_taken.classList.remove("hidden");
    }
    //jika email tidak valid, maka munculkan warning
    if (!isValidEmail) {
      emailWarning_notvalid.classList.remove("hidden");
    }
      //text input menjadi merah (invalid)
      emailInput.style.backgroundColor = "red"
  }

}

//untuk memeriksa apakah semua input sudah valid (berwarna hijau)
function checkAllFieldsValid() {
    let allValid = true;
    const inputFields = document.querySelectorAll('input');
    //mengecek semua text input
    for (let i = 0; i < inputFields.length; i++) {
      const computedStyle = getComputedStyle(inputFields[i]);
      const backgroundColor = computedStyle.backgroundColor;
      if (backgroundColor != "rgb(0, 128, 0)") {
        allValid = false;
      }
    }
    return allValid;
  }



  