// models/UserModel.js

import mongoose from "mongoose";

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role:{
    type:String,
    enum:['user','Admin'],
    default:'user'
},
  boardData: {
    type: Object,
    default: {
      boards: [{}],
      activeBoardId: null,
    },
  },
},{timestamps:true});

const User = mongoose.model("User", userSchema);
export default User;
