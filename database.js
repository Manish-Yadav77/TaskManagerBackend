 const mongoose = require('mongoose')

require('dotenv').config();

const connectDB = async()=>{
    try {
        await mongoose.connect(process.env.MONGO_URL
        )
        console.log("MongoDB connected ✅");
        
    } catch (error) {
        console.log(error);        
        console.log('MongoDB connection error ❌\n',error);
    }
}

module.exports=connectDB;