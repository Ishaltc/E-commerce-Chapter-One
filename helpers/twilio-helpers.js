  

const sms = require ('twilio')(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN);

const serviceSid = process.env.TWILIO_SERVICE_SID;


module.exports={
    dosms:(nodata)=>{
     let res = {}
      return new Promise(async(resolve,reject)=>{
         
      sms.verify.services(serviceSid).verifications.create({
       
        to : `+91${nodata.number}`,
        channel : "sms"


      }).then((res)=>{

        res.valid = true;
        resolve(res)
     console.log(res);

    
    })
        


      })
      
      
      


    },

    otpVerify:(otpData,nuData)=>{



        let resp = {}
        return new Promise(async(resolve,reject)=>{
           
        sms.verify.services(serviceSid).verificationChecks.create({
         
          to : `+91${nuData.number}`,
          code : otpData.otp
  
  
        }).then((res)=>{
  
         console.log('verfication faild');
         console.log(res);
       resolve(res);
  
      
      })
          
  
  


        })
    }
}