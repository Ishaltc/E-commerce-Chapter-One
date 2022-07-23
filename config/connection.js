const mongoDB= require('mongodb')
const mongoClient=require('mongodb').MongoClient
const state = {
    db:null
}


module.exports.link=function(done){
   // const url = 'mongodb://0.0.0.0:27017'
    const url = 'mongodb://0.0.0.0:27017';
    const dbname = 'chapter-one'

    mongoClient.connect(url,(err,data) => {
        if(err) return done(err)

        state.db=data.db(dbname)
        done() 
    })
 
}
module.exports.get=function(){
    return state.db
}