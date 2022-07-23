module.exports = {
  errorHandler: (err, req, res, next) => {
    console.log(err);
    res.render('user/error500',{layout:'error-layout'})
  },
}; 