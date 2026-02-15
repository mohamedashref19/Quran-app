const mongoose = require("mongoose")
const validator = require("validator")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const userSchema = new mongoose.Schema({
    name:{type:String,required:[true, "Please provide a name"]},
    email:{type:String,required:[true, "Please provide a email"],unique:true,validate: [validator.isEmail, "Please provide a valid email"],},

    password:{type:String,required: [true, "Please provide a password"],select: false,},
    passwordConfirm:{
     type:String,
     required:[true, "Please provide a password"],
     validate:{
      validator:function(el) {
        return el === this.password
      },
      message: "Passwords are not the same!",
     }
    },
   role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
    changepasswordAt: Date,
  passwordresetToken: String,
  resetpasswordTokenExpire: Date,
  active: {
    type: Boolean,
    default: true,
    // select: false,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  otp: String,
  otpExpires: Date,
    
    lastRead:{
        surah:{type:Number,default:1},
        ayah:{type:Number,default:1}
    },
    createdAt:{type:Date,default:Date.now}
})


userSchema.pre("save",async function(){
    if(!this.isModified("password")) return 
    this.password = await bcrypt.hash(this.password,12)
    this.passwordConfirm=undefined
})

userSchema.pre("save", async function () {
    if (!this.isModified("password") || this.isNew) return;
  this.changepasswordAt = Date.now() - 1000;
})

userSchema.methods.correctPassword = async function (candidatePassword,userPassword) {
    return await bcrypt.compare(candidatePassword,userPassword)
    
}

userSchema.methods.changepassword =  function (jwtTime) {
   if(this.changepasswordAt){
    const changeTime  = parseInt(this.changepasswordAt.getTime()/1000,10)
    return jwtTime < changeTime
   }
   return false
}

userSchema.methods.createResetpasswordToken= function(){
    const resetToken = crypto.randomBytes(32).toString("hex")
    this.passwordresetToken= crypto.createHash("sha256").update(resetToken).digest("hex")
    this.resetpasswordTokenExpire= Date.now() + 1000 *10*60
    return resetToken
}

module.exports=mongoose.model("User",userSchema)



