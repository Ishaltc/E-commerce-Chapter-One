// const multer = require('multer');
// const fs=require('fs')

// //set storage
// var storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'public/product-images')
//     },
//     filename: function (req, file, cb) {
//         //image.jpg
//         var ext = file.originalname.substring(file.originalname.lastIndexOf('.'))
//         cb(null, file.filename + '-' + Date.now() + ext)
//     }
// })

// module.exports = store = multer({ storage: storage })

// var storage=multer.diskStorage({
//     destination:function(req,file,callback){
//         var dir='./uploads';
//         if(!fs.existsSync(dir))
//         {
//             fs.mkdirSync(dir);
//         }
//         callback(null,dir)
//     },
//     filename:function(req,file,callback){
//         callback(null,file.originalname);
//     }
// });
// var multer= multer({storage:storage}).array('files',12);
//  module.exports = store = multer({ storage: storage })