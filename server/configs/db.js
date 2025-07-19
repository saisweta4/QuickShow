import mongoose from "mongoose";

const connectDB = async() =>{
    try{
        mongoose.connection.on('connected',()=>console.log('Database Connected'));
        await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`)
         console.log(' MongoDB connected to:', mongoose.connection.name);
    } catch(error) {
      console.log(error.message);
    }
}

export default connectDB;