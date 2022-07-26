const { response, text } = require('express');
var express = require('express');
var router = express.Router();
var adminHelpers = require('../helpers/admin-helpers')
var productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
const fs = require('fs');
const { asyncWrapper } = require('../middleware/asyncwrapper');
const nodemailer = require('nodemailer');
const mailconnection=require('../config/mailconnection')
//const { getAllOrderItems } = require('../helpers/admin-helpers');


/* GET users listing. */

//middleware for checking loggedIn



const verifyAdminLogin = (req, res, next) => {
  if (req.session.admin) {
    next()
  } else {
    res.redirect('/admin/admin-login')
  }
}

router.get("/", verifyAdminLogin, async (req, res, next) => {
  let admin = req.session.admin;

  try {
    const allData = await Promise.all([
      adminHelpers.getPaymentCount(),
      adminHelpers.totalRevenue(),
      adminHelpers.totalUsersCount(),
      adminHelpers.totalSalesCount(),
      adminHelpers.getStatusDetails(),
      adminHelpers.totalProductCount(),
    ]);
    res.render("admin/admin-index", {
      admin: true,
      layout: "admin-layout",
      paymentCounts: allData[0],
      totalIncome: allData[1],
      totalUsersCount: allData[2],
      totalSalesCount: allData[3],
      statusDetails: allData[4],
      totalProductCount: allData[5],
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});



router.get('/admin-login', (req, res) => {
  let adminErr = req.session.adminErr
  res.render('admin/admin-login', { adminErr, loginPage: true, admin: true, layout: "admin-layout" })
  req.session.adminErr = false
})




router.post('/admin-login', (req, res, next) => {
  try {

    adminHelpers.adLogin(req.body).then((response) => {
      if (response.status) {
        req.session.admin = true
        res.redirect('/admin/')

      } else {
        req.session.adminErr = true
        res.redirect('/admin/admin-login')
      }
    })
  } catch (error) {
    next(error)
  }
})



//console.log(req.body);





router.get('/view-categories', verifyAdminLogin, async (req, res) => {
  let viewCat = adminHelpers.viewCategory().then((datas) => {
    res.render('admin/view-categories', { admin: true, viewCat: datas, layout: 'admin-layout' })
  })



})

router.post('/viewCatt', verifyAdminLogin, (req, res) => {
  adminHelpers.addCategory(req.body).then((datas) => {
    res.redirect('/admin/view-categories')
  })
})
//edit category name
router.post('/editCatt/:id', verifyAdminLogin, (req, res) => {
  adminHelpers.updateCategory(req.params.id, req.body).then((resp) => {
    if (resp) {
      //  console.log("return data" + resp);
      res.redirect('/admin/view-categories')

    }

  })
})
router.get('/delete-category/:id', verifyAdminLogin, (req, res) => {
  let cateId = req.params.id
  adminHelpers.deleteCategory(cateId)
  res.redirect('/admin/view-categories')

})



router.get('/view-subcategories', verifyAdminLogin, async (req, res) => {

  adminHelpers.viewSubCat().then((data) => {
    req.session.data = data
    let show = data

    res.render('admin/view-subcategories',
      { layout: 'admin-layout', admin: true, datas: data, admin: true })

  })

})
// subcategory
router.post('/add-subCat', verifyAdminLogin, (req, res) => {
  adminHelpers.addSubCatt(req.body).then((data) => {

    res.redirect('/admin/view-subcategories')
  })
})


router.get('/delete-subcategory/:id', verifyAdminLogin, (req, res) => {
  let subCat = req.params.id
  adminHelpers.deleteSubCat(subCat).then(() => {
    res.redirect('/admin/view-subcategories')
  })


})

//product adding
router.get('/add-books', verifyAdminLogin, (req, res) => {
  adminHelpers.viewSubCat().then((data) => {
    let viewCat = adminHelpers.viewCategory().then((datas) => {
      req.session.data = data
      let show = data
      res.render('admin/add-books',
        { admin: true, layout: 'admin-layout', show, viewCat: datas })
    })
  })
})

//product adding
router.post('/add-books', verifyAdminLogin, (req, res) => {
  productHelpers.addProduct(req.body, (id) => {
    if (req.files.image) {
      let image = req.files.image
      image.mv('./public/product-images/' + id + '.jpg', (err) => {
        if (!err) {
          res.redirect('/admin/add-books')
        } else {
          console.log(err);
        }
      })
    }
  })
})


//product-details
router.get('/view-books', verifyAdminLogin, (req, res) => {
  let productInfo = productHelpers.getAllProducts().then((data) => {
    res.render('admin/view-books',
      { layout: 'admin-layout', productInfo: data ,admin: true})
  })
})

// user-details
router.get('/view-users', verifyAdminLogin, (req, res) => {
  let userInfo = userHelpers.getAllUsers().then((data) => {
    //console.log(userInfo);
    res.render('admin/view-users',
      { layout: 'admin-layout', userInfo: data,admin: true })
  })
})

router.get("/delete-product/:id", verifyAdminLogin, (req, res) => {
  let proId = req.params.id;
  productHelpers.deleteProduct(proId);
  res.redirect("/admin/view-books");
});

// showing product in edit page
router.get("/edit-product/:id", verifyAdminLogin, async (req, res) => {
  let productInfo = await productHelpers.getOneProductDetails(req.params.id);
  adminHelpers.viewSubCat().then((data) => {
    let show = data;
    let viewCat = adminHelpers.viewCategory().then((datas) => {
      // console.log(productInfo);
      res.render("admin/edit-product", {
        layout: "admin-layout",
        admin: true,
        productInfo,
        viewCat: datas,
        show,
      });
    });
  });
});

// edit product
router.post("/edit-product/:id", verifyAdminLogin, (req, res) => {
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect("/admin/view-books");
    if (req.files) {
      let id = req.params.id;
      let image = req.files.image;
      image.mv("./public/product-images/" + id + ".jpg");
    }
  });
});


//user-block-unblock
router.post("/userAction", verifyAdminLogin, (req, res) => {
  if (req.body.action == "block") {
    adminHelpers.blockUser(req.body.userId).then((response) => {
      res.json(response);
    });
  } else {
    adminHelpers.unBlockUser(req.body.userId).then((response) => {
      res.json(response);
    });
  }
});


//order details
router.get('/admin-order-details', verifyAdminLogin, async (req, res, next) => {
  try {
    const ordersItems = await adminHelpers.
      getallOrderItems()
      

    res.render('admin/admin-order-details',
      { layout: "admin-layout", ordersItems,admin: true })

  } catch (error) {
    next(error)
  }
})


//changing delivery status
router.post('/changeDeliveryStatus', verifyAdminLogin, async (req, res, next) => {
  try {
    const response = await adminHelpers.changeDeliveryStatus(req.body)
    res.json(response)
  } catch (error) {
    next(error)
  }

})

//request details
router.get('/request-details/:id', verifyAdminLogin, async (req, res, next) => {
  try {
    const requestData = await adminHelpers.getUsersRequest(req.params.id)
    console.log(requestData);

    res.render('admin/request-details',
      { layout: 'admin-layout', requestData, admin: true })
  } catch (error) {
    next(error)
  }
})


router.get('/nodemailer-form/:emailId',verifyAdminLogin,(req,res)=>{
  let admin = req.session.admin;
 let userId= req.params.emailId
 
  res.render('admin/nodemailer-form',{layout:'admin-layout',admin,userId,admin: true})
})



// nodemailer
router.post("/sent-mail",verifyAdminLogin, async (req, res, next) => {
  try {
  
    const { name, userId, company, email, phone, message } = req.body;
    await mailconnection.doEmail(email, name, message)
    res.redirect("back");
  } catch (error) {
    next(error);
  }

});





//admin-logout
router.get('/admin-logout', (req, res) => {
  req.session.admin = false
  res.redirect('/admin/admin-login')
})







module.exports = router;
