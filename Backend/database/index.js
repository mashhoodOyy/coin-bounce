
const mongoose = require('mongoose');
const {CONNECT_CONNECTION_STRING}=require('../config/index');
const connectionString=CONNECT_CONNECTION_STRING;

const dbConnect = async() =>{
    try {
        const conn= await mongoose.connect(connectionString);
        console.log(`Database is Connected to Host: ${conn.connection.host}`);
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

module.exports=dbConnect;