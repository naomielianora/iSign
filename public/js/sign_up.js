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

    //ambil username yang diinput user
    let usernameInput = document.getElementById('username');
    //untuk mengecek apakah username yang diinput oleh user belum terdaftar di database
    //menggunakan fecth API sehingga user tidak perlu submit terlebih dahulu untuk mengetahui
    usernameInput.addEventListener('input', function () {
      let usernameInput = this.value;
      checkUsernameAvailability(usernameInput);
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
async function checkUsernameAvailability(inputed_username) {
    try {
      const response = await fetch(`/check_username?inputed_username=${encodeURIComponent(inputed_username)}`);
      
      if (response.ok) {
        const responseData = await response.json();
        updateUsernameInput(responseData.taken === false, inputed_username.length == 3, inputed_username === inputed_username.toUpperCase());
      } else {
        console.error('Network response was not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
}


function updateUsernameInput(usernameAvailable, isThreeLetters, isCapital) {
    let usernameInput = document.getElementById('username');
    let usernameWarning_same = document.getElementById('username_warning_same');
    let usernameWarning_capital = document.getElementById('username_warning_capital');
    let usernameWarning_three = document.getElementById('username_warning_three');
    usernameWarning_same.classList.add("hidden");
    usernameWarning_capital.classList.add("hidden");
    usernameWarning_three.classList.add("hidden");
    //jika username unik & terdiri dari 3 huruf, maka text input menjadi hijau (valid)
    if (usernameAvailable && isThreeLetters && isCapital) {
        usernameInput.style.backgroundColor = "green"
    } else {
        //jika email tidak unik, maka munculkan warning
      if (!usernameAvailable) {
        usernameWarning_same.classList.remove("hidden");
      }
      if(!isCapital){
        usernameWarning_capital.classList.remove("hidden");
      }

      if(!isThreeLetters){
        usernameWarning_three.classList.remove("hidden");
      }
        //text input menjadi merah (invalid)
        usernameInput.style.backgroundColor = "red"
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



  