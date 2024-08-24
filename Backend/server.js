const express = require('express');
const dbConnect=require('./database/index');
const {PORT}=require('./config/index');
const router=require('./routes/index');
const errorHandler=require('./middlewares/errorHandler');
const cookieparser=require('cookie-parser');

const app = express();

app.use(express.json());
app.use(cookieparser());
app.use(router);

dbConnect();

app.use(errorHandler);

app.listen(PORT, console.log(`Backend is running on port: ${PORT}`));