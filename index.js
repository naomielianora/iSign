import express from 'express';

const PORT = 8080;
const app = express();

app.listen(PORT, () => {
    console.log(`Server is ready, listening on port ${PORT}`);
});

app.set('view engine', 'ejs');
//dipakai untuk routing path file css, assets
app.use(express.static('public'));

//page yang pertama kali muncul (home)
app.get('/', (req, res)=>{
    res.render('home')
})

app.get('/check_sign', (req, res)=>{
    res.render('check_sign')
})