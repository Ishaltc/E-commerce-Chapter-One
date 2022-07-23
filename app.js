const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session=require('express-session')
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const hbs=require('express-handlebars')
const app = express();
const db=require('./config/connection')
const fileUpload=require('express-fileupload')
const nocache = require("nocache")
const { errorHandler } = require('./middleware/errorhandler')
const jwt = require('jsonwebtoken');
const dotenv=require('dotenv')
dotenv.config()
// view engine setup
app.use(nocache());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine','hbs');
app.engine('hbs',hbs.engine({helpers:{
  inc:function(value,options){
    return parseInt(value)+1
  }
}, extname:'hbs',layoutsDir:__dirname+'/views/layout',partialsDir:__dirname+'/views/partials'}))
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload())
app.use(session(
  {secret:"lalu", 
  resave: true,
  saveUninitialized: true,
  cookie:{maxAge:700000}}))
db.link((err)=>{
  if(err) console.log("Connection Error"+err)
   else console.log("Database Connected to port 27017");
})
app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 500 and forward to error handler
app.use(function(req, res, next) {
  res.render('user/error404',{layout:'error-layout' })
});

// search



// error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

// error handler
app.use(errorHandler)

module.exports = app;
