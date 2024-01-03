import { dbConnect } from "./connectionDB.js";

//untuk mengambil data user yang memiliki email dan password yang sama dengan yang diinput user
export const getUserData = async(username, pass) => {
    const conn = await dbConnect();
    return new Promise((resolve, reject) => {
        conn.query('SELECT * FROM user WHERE username = ? AND password = ?', [username, pass], (err, result) => {
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
