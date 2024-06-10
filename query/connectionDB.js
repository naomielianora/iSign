//DATABASE CONNECTION
import mysql from 'mysql'

//perlu dibuat terlebih dahulu database di phpmyadmin dengan nama "asdos_portal", lalu import file table structure.sql/dummy data.sql
const pool = mysql.createPool({
    user: 'root',
    password: '',
    database: 'penelitian',
    host: 'localhost'
  
});

export const dbConnect = () => {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, conn) => {
            if(err){
                reject (err);
            }
            else{
                resolve(conn);
            }
        }
        )
    })
};