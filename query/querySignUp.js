import { dbConnect } from "./connectionDB.js";

//cek ke database apakah email yang diisi sudah ada di database
export const usernameChecker = async(username) => {
    const conn = await dbConnect();
    return new Promise((resolve, reject) => {
        conn.query('SELECT id_user FROM user WHERE username = ?', [username], (err, result) => {
            if(err){
                reject (err);
            }
            else{
                resolve(result);
            }
        });
        conn.release();
    });
};

//untuk memasukan data asdos yang sign up/buat akun ke database
export const signUpUser = async(nama_lengkap_sign_up, username_sign_up, password_sign_up, encryptedPrivateKey, publicKey) => {
    const conn = await dbConnect();
    return new Promise((resolve, reject) => {
        conn.query('INSERT INTO User (nama_lengkap, username, password, private_key, public_key) VALUES (?,?,?,?,?)', 
        [nama_lengkap_sign_up, username_sign_up, password_sign_up, encryptedPrivateKey, publicKey], (err, result) => {
            if(err){
                reject (err);
            }
            else{
                resolve(result);
            }
        })
    })
  };