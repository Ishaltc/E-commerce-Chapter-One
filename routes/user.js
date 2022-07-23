const express = require("express");
const router = express.Router();
const userHelpers = require("../helpers/user-helpers");
const twilioHelpers = require("../helpers/twilio-helpers");
const productHelpers = require("../helpers/product-helpers");
const adminHelpers = require("../helpers/admin-helpers");
const { asyncWrapper } = require("../middleware/asyncwrapper");
const { NotificationContext } = require("twilio/lib/rest/api/v2010/account/notification");
const { response } = require("../app");
const mailconnection = require('../config/mailconnection')

let productsfilter = []


// verify Login
const verifyLogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* GET home page. */
router.get("/", async function (req, res, next) {
  let cartCount = null;
  const user = req.session.user;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
  }
  let productInfo = productHelpers.getAllProducts().then((datas) => {
    adminHelpers.viewSubCat().then((data) => {
      if (req.session.loggedIn) {
        res.render("user/index", {
          user: user,
          layout: "layout",
          productInfo: datas,
          cartCount,
        });
      } else {
        res.render("user/index", {
          layout: "layout",
          productInfo: datas,
          data,
        });
      }
    });
  });
});




router.get("/signup", (req, res) => {
  let exist = req.session.exists;

  res.render("user/signup", {
    layout: "layout",
    existErr: req.session.existErr,
  });
  req.session.existErr = false;
});

router.get("/otp", (req, res) => {
  res.render("user/otp", { layout: "layout" });
});

router.post("/signup", (req, res) => {
  req.session.otpBody = req.body;
  userHelpers.isExist(req.session.otpBody).then((data) => {
    if (data.exist) {
      req.session.exist = true;
      req.session.existErr = "Email has taken already";
      res.redirect("/signup");
    } else {
      //console.log(req.session.otpBody);
      twilioHelpers.dosms(req.session.otpBody).then((data) => {
        if (data) {
          res.redirect("/otp");
        } else {
          redirect("/signup");
        }
      });
    }
  });
});

router.post("/otp", (req, res) => {
  twilioHelpers.otpVerify(req.body, req.session.otpBody).then((data) => {
    if (data.valid) {
      userHelpers.doSignup(req.session.otpBody).then((response) => {
        res.redirect("/login");
      });
    } else {
      res.redirect("/otp");
    }
  });
});

router.get("/login", (req, res) => {
  if (req.session.loggedIn) {
    res.redirect("/");
  } else {
    res.render("user/login", {
      loginErr: req.session.loginErr,
      layout: "layout",
    });
    req.session.loginErr = false;
  }
});

router.post("/login", (req, res) => {
  //console.log(req.body);
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true;
      req.session.user = response.user;
      res.redirect("/");
    } else {
      req.session.loginErr = "Invalid email or password";
      res.redirect("/login");
    }
  });
});

router.get("/cart", verifyLogin, async (req, res) => {
  console.log(req.session.user._id);
  let products = await userHelpers.getCartProducts(req.session.user._id);
  cartCount = await userHelpers.getCartCount(req.session.user._id);
  const totalValue = await userHelpers.getTotalAmount(req.session.user._id);

  if (cartCount > 0) {
    res.render("user/cart", {
      layout: "layout",
      user: req.session.user._id,
      products,
      cartCount,
      totalValue,
    });
  } else {
    res.redirect("/empty-cart");
  }
});

// cart
router.get("/add-to-cart/:id", (req, res) => {
  console.log("api call");
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
    // res.redirect('/')
  });
});



//page shop
router.get("/shop", async (req, res) => {
  const user = req.session.user;
  productHelpers.getAllProducts().then((details) => {
    if (details) {
      productsfilter = details
    }

    res.redirect("/shopee")


  });
});




router.get('/shopee', async (req, res, next) => {
  try {

    let cartCount = null;
    const user = req.session.user;

    if (req.session.user) {
      const cartCount = await userHelpers.getCartCount(req.session.user._id);

      const datas = await adminHelpers.viewCategory()
      // console.log(datas);
      res.render('user/shop', {
        layout: 'layout',
        datas,
        cartCount,
        productsfilter,
        user

      })

    } else {
      const datas = await adminHelpers.viewCategory()
      res.render('user/shop', {
        layout: 'layout',
        datas,
        productsfilter
      })
    }
  } catch (error) {
    next(error)
  }


})

//checkout page,
router.get("/checkout/:id", verifyLogin, async (req, res, next) => {

  const user = req.session.user
  console.log(req.params.id)
  let cartId = req.params.id
  if (cartId == 'cart') {
    const user = req.session.user
    try {

      const allData = await Promise.all([
        userHelpers.getUserAddress(req.session.user._id),
        userHelpers.getTotalAmount(req.session.user._id),
        userHelpers.getCartProducts(req.session.user._id),
        userHelpers.getCartCount(req.session.user._id),

      ])
      let addressDetails = {
        address: true,
        addressDetails: allData[0]
      }
      res.render("user/checkout", {
        layout: "layout",
        userAddress: addressDetails,
        total: allData[1],
        product: allData[2],
        cartCount: allData[3],
        user
      })

    } catch (error) {
      next(error);
    }
  } else {
    req.session.buyNOWStatus = true

    const buyNowData = req.session.buyNow
    const total = buyNowData.price
    const quantity = 1
    res.render("user/checkout", { layout: "layout", buyNowData, total, quantity, buyNOWStatus: true, user })



  }
})



// managing product quantity in cart and throwing - min button
router.post("/change-product-quantity", (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user);
    res.json(response);
  });
});

//payment method
router.post("/checkout", async (req, res, next) => {
  try {
    if (req.session.buyNOWStatus) {
      let product = req.session.buyNow
      let price = product.price
      const orderId = await userHelpers.getPlaceOrder(req.body, product, price)
      if (req.body["payment-method"] === "COD") {
        res.json({ codSuccess: true });
      } else {
        userHelpers.generateRazorpay(orderId, price).then((response) => {
          res.json(response);
        });
      }


    } else {

      const products = await userHelpers.getCartProductList(req.body.userId);

      const totalPrice = await userHelpers.getTotalAmount(req.body.userId);
      const orderId = userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
        if (req.body["payment-method"] === "COD") {
          res.json({ codSuccess: true });
        } else {
          userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
            res.json(response);
          })
        }
      })

    }vi
  } catch (error) {
    next(error)
  }



})

// order success page
router.get("/order-success", verifyLogin, (req, res) => {
    res.render("user/order-success", { layout: "layout" });
  });



//order details
router.get("/order-details/", verifyLogin, async (req, res, next) => {
  user = req.session.user
  try {
    const orderItems = await userHelpers.getOrderProducts(req.session.user._id)
    const count = await userHelpers.getOrderCount(req.session.user._id)
    if (count > 0) {
      console.log(orderItems);

      res.render("user/order-details", { layout: "layout", orderItems, user, count });
    } else {
      res.render('user/empty-order', { layout: "layout", user, count })
    }

  } catch (error) {
    next(error)
  }
});




router.get("/empty-cart", (req, res) => {
  res.render("user/empty-cart", { layout: "layout" });
});



//removing product from cart
router.post("/remove-product", verifyLogin, (req, res) => {
  userHelpers.removeProduct(req.body).then(async (response) => {
    res.json(response);
  });
});


// wishlist
router.get("/wishlist", verifyLogin, (req, res) => {
  userHelpers.getWishlistProduct(req.session.user._id).then((products) => {
    if (products.length != 0) {
      //  console.log(products);
      res.render("user/wishlist", {
        layout: "layout",
        user: req.session.user,
        products,
      });
    } else {
      res.redirect("/empty-cart");
    }
  });
});



router.get("/add-to-wishlist/:wishlistId", (req, res, next) => {
  userHelpers.addToWishlist(req.params.wishlistId, req.session.user._id)
    .then((status) => {
      if (status) {
        res.json({ added: true });
      } else {
        res.json({ exist: true });
      }
    }).catch((error) => {

    })
});


//remove from wishlist
router.post("/removeWishlist", (req, res) => {
  userHelpers.removeWishlistProduct(req.body).then(async (response) => {
    res.json(response);
  });
});



// bank payment
router.post("/verify-payment", verifyLogin, (req, res) => {
  userHelpers
    .verifyPayment(req.body)
    .then(() => {
      userHelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        console.log("payment success");
        res.json({ status: true });
      });
    })
    .catch((err) => {
      console.log(err);
      res.json({ status: false, errMsg: "" });
    });
});



// direct buy
router.get("/view-details/:id", (req, res) => {
  let user = req.session.user;
  const proId = req.params.id;
  const cartCount = null;
  if (req.session.user) {
    userHelpers.getCartCount(req.session.user._id);
  }
  userHelpers.showProduct(req.params.id).then((products) => {
    res.render("user/one-product", {
      layout: "layout",
      products,
      user,
      cartCount,
    });
  });
});



// buy now-passing product to session
router.get("/buyNow/:id", async (req, res, next) => {
  try {
    const buyNowProduct = await userHelpers.getaproductAmount(req.params.id)
    req.session.buyNow = buyNowProduct
    console.log(req.session.buyNow);
    res.redirect('/checkout/buy')
  } catch (error) {
    next(error)
  }
})


//filter
router.post("/products/filter", async (req, res, next) => {
  try {
    const detail = req.body;
    // console.log(detail);

    const price = parseInt(detail.price);
    const filter = [];
    for (const i of detail.categoryName) {
      filter.push({ category: i });
    }
    let datafilter = await userHelpers.filterProducts(filter, price);
    productsfilter = datafilter
    res.json({ status: true })
    // if (req.body.sort == "sort") {
    //   res.json({ status: true });
    // }
    // if (req.body.sort == "lh") {
    //   filteredProducts.sort((a, b) => a.price - b.price);
    //   res.json({ status: true });
    // }
    // if (req.body.sort == "hl") {
    //   filteredProducts.sort((a, b) => b.price - a.price);
    //   res.json({ status: true });
    // }
  } catch (error) {
    next(error);
  }
});



//forget password
router.get("/forget-password", (req, res) => {
  res.render("user/forget-password",
    {
      layout: "layout",
      resetError: req.session.resetError
    });
  req.session.resetError = false;
});




router.get("/reset-password", (req, res) => {
  res.render("user/reset-password",
    { layout: "layout" });
});





router.get('/new-password', (req, res) => {
  res.render('user/new-password', { layout: 'layout' })
})



//forget password
router.post("/forgetPassword", async (req, res, next) => {
  try {
    const email = await userHelpers.checkForgetPassword(req.body.email);
    req.session.setOtp = email
    if (email) {
      twilioHelpers.dosms(req.session.setOtp).then((data) => {
        if (data) {
          res.redirect('/reset-password')
        }
      })
    }
    else {

      req.session.resetError = true;
      res.redirect('/forget-password')
    }
  } catch (error) {
    next(error)
  }


})




//forget password
router.post('/reset-pass', (req, res) => {
  console.log(req.body);
  twilioHelpers.otpVerify(req.body, req.session.setOtp).then((data) => {
    if (data.valid) {
      res.redirect('/new-password')
    } else {
      res.redirect("back")
    }

  })
})



//forget password
router.post("/update-password", async (req, res, next) => {
  try {
    const { password } = req.body
    let data = await userHelpers.newPassword(req.session.setOtp._id, password)
    console.log('data', data);
    res.redirect('/login')
  } catch (error) {
    next(error)
  }
})





// cancel order
router.post("/cancel-order", verifyLogin, async (req, res, next) => {

  try {
    await userHelpers.userCancelOrder(req.body).then((response) => {
      res.json({ response: true });
    })
  } catch (error) {
    next(error);
  }
});



//requesting for book

router.get('/request-book', verifyLogin, async (req, res) => {
  user = req.session.user
  cartCount = await userHelpers.getCartCount(req.session.user._id);
  res.render('user/request-book', {
    layout: 'layout', cartCount, user
  })

})



router.post('/request-book/:id', verifyLogin, async (req, res, next) => {
  console.log(req.params.id);
  try {

    userHelpers.requestABook(req.params.id, req.body)
    const subject = "Request Book"
    const content = "Your Book Request for " + req.body.title + " Has been Approved .We will connect you ASAP"

    await mailconnection.doEmail(req.body.email, subject, content)
    res.redirect('/request-book')
  } catch (error) {
    next(error)
  }
})



// user -profile
router.get('/user-profile', verifyLogin, async (req, res, next) => {
  try {
    const user = req.session.user;
    const datas = await userHelpers.userProfile(req.session.user._id)
    if (datas.address) {
      const address = datas.address[0]
      console.log(address);

      res.render('user/user-profile', {
        layout: 'layout', user, datas, address
      })
    } else {
      res.render('user/user-profile', {
        layout: 'layout', user, datas
      })
    }
    req.session.profileId = datas
  } catch (error) {
    console.log(error);
    next(error)
  }
})

router.get('/requested-order', verifyLogin, async (req, res, next) => {
  const user = req.session.user
  try {
    // const datas = await userHelpers.userProfile(req.session.user._id)
    const request = await userHelpers.getRequestDetails(req.session.user._id)
    console.log(request);
    if (request) {
      res.render('user/requested-order', { layout: 'layout', user })
    } else {
      res.redirect("/empty-cart");
    }
  } catch (error) {
    next(error)
  }

})



router.get("/new-arrivals", async function (req, res, next) {
  let cartCount = null;
  const user = req.session.user;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
  }

  const newProducts = await productHelpers.getNewProduct(req, res)
  adminHelpers.viewSubCat().then((data) => {
    //console.log(user);
    //console.log(productInfo);
    if (req.session.loggedIn) {
      res.render("user/new-arrivals", {
        user: user,
        layout: "layout",
        newProducts,
        cartCount,
      });
    } else {
      res.render("user/new-arrivals", {
        layout: "layout",
        newProducts,
        data,
      });
    }
  });
});


//searching products
router.post('/search-products', (req, res, next) => {

  try {
    userHelpers.searchProducts(req.body.search).then((response) => {
      productsfilter = response
      res.redirect('/shopee')
    })

  } catch (error) {
    next(error)
  }
})

router.get('/add-address', verifyLogin, async (req, res) => {
  const user = req.session.user
  const datas = await userHelpers.userProfile(req.session.user._id)
  res.render('user/add-address', { layout: 'layout', user, datas })
})

//adding address for user profile
router.post('/adding-address', verifyLogin, (req, res) => {
  userHelpers.addAddress(req.session.profileId._id, req.body)
  res.redirect('/user-profile')
})



//editing profile address
router.get('/edit-profile-address', verifyLogin, async (req, res, next) => {
  try {
    const user = req.session.user;
    const datas = await userHelpers.userProfile(req.session.user._id)
    const address = datas.address[0]
    res.render('user/edit-profile-address', { layout: 'layout', user, address })
  } catch (error) {
    next(error)
  }
})


//editing profile address
router.post('/editing-address/:id', verifyLogin, (req, res, next) => {
  try {
    console.log(req.body);
    userHelpers.editAddress(req.body, req.params.id)

    res.redirect('/user-profile')
  } catch (error) {
    next(error)
  }
})

//invoice
router.get('/invoice', verifyLogin, (req, res) => {
  user = req.session.user

  res.render('user/invoice', { layout: 'layout', user })
})





router.get("/logout", (req, res) => {
  req.session.loggedIn = false;
  res.redirect("/");
});

module.exports = router;
