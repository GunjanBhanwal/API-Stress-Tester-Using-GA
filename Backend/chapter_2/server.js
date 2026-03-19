const express = require('express');
//basically this imports express


//defined backend application
const app = express();
//this will create a backend application

const PORT = 8383;
//defining port number

app.listen(PORT, ()=> {console.log(`server has started on : ${PORT}`)})
//this will make the application listen to request