//DATABASE CONNECTION
import mysql from 'mysql'

//perlu dibuat terlebih dahulu database di phpmyadmin dengan nama "iSign", lalu import file table_structure.sql di folder "data"
const pool = mysql.createPool({
    user: 'root',
    password: '',
    database: 'iSign',
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