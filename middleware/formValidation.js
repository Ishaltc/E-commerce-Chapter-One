module.exports={
    requirePassword: check("password")
    .trim()
    .isLength({min:4,max:20})
    .withMessage("Password must be between 4 and 20 characters"),
    requirePasswordConfirmation:check("confirmation")
    .trim()
    .isLength({min:4,max:20})
    .withMessage("Password must be between 4 and 20 characters")
    .custom((passwordConfirmation ,{req})=>{
        if(passwordConfirmation !==req.body.password){
throw new Error("Password doesn't match")
        }   
     })
}