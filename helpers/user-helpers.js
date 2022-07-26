const db = require("../config/connection");
const collection = require("../config/collection");
const bcrypt = require("bcrypt");
const { response } = require("../app");
const ObjectId = require("mongodb").ObjectId;
const Razorpay = require('razorpay');
const { resolve } = require("path");
const { PerformanceNodeTiming } = require("perf_hooks");
const moment = require('moment')
const { WISHLIST_COLLECTION, ORDER_COLLECTION } = require("../config/collection");
const { abort } = require("process");
const dotenv=require("dotenv")
dotenv.config()
// const instance = new Razorpay({
//   key_id: 'rzp_test_ejgdFayGndXzKn',
//   key_secret: 'Ls2gjc1fhHyLTixCcyImpAfN',

// })

const instance = new Razorpay({
 key_id: process.env.RAZORPAY_KEY_ID,
   key_secret:process.env.RAZORPAY_SECRET_ID,
  
})

module.exports = {
  doSignup: (userData) => {
    userData.isBlocked = false;
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10);
      db.get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData)
        .then((data) => {
          //data.ObjectId=true
          resolve(data);
        });
    });
  },
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email, isBlocked: false });
      if (user) {
        bcrypt.compare(userData.password, user.password).then((status) => {
          console.log(status);
          if (status) {
            response.user = user;
            response.status = true;
            resolve(response);
            console.log("success");
          } else {
            console.log("failed");
            resolve({ status: false });
          }
        });
      } else {
        console.log("failed again");
        resolve({ status: false });
      }
    });
  },

  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      let userData = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray();
      if (userData) resolve(userData);
      // console.log(userData);
      reject("its error");
    });
  },
  isExist: (data) => {
    return new Promise(async (resolve, reject) => {
      let valid = {};
      let exist = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: data.email });
      if (exist) {
        valid.exist = true;
        resolve(valid);
      } else {
        resolve(valid);
      }
    });
  },

  blockUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .updateOne({ _id: Object(userId) }, { $set: { isBlocked: true } });
      resolve(user);
    });
  },
  UnblockUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .updateOne({ _id: Object(userId) }, { $set: { isBlocked: false } });
      resolve(user);
    });
  },

  addToCart: (proId, userId) => {
    let proObj = {
      item: ObjectId(proId),
      quantity: 1,
      orderStatus: "pending",
    

    };
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == proId
        );
        //  console.log(proExist);
        if (proExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: ObjectId(userId), "products.item": ObjectId(proId) },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: ObjectId(userId) },
              {
                $push: { products: proObj },
              }
            )
            .then((response) => {
              resolve();
            });
        }
      } else {
        let cartObj = {
          user: ObjectId(userId),
          products: [proObj],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            resolve();
          });
      }
    });
  },

  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let cartItems = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .aggregate([
            {
              $match: { user: ObjectId(userId) },
            },
            {
              $unwind: "$products",
            },
            {
              $project: {
                item: "$products.item",
                quantity: "$products.quantity",
              },
            },
            {
              $lookup: {
                from: collection.PRODUCT_COLLECTION,
                localField: "item",
                foreignField: "_id",
                as: "product",
              },
            },
            // converting product array to object
            {
              $project: {
                item: 1,
                quantity: 1,
                image: 1,
                product: { $arrayElemAt: ["$product", 0] },
              },
            },

            {
              $addFields: {
                totalPrice: {
                  $multiply: ["$quantity", "$product.price"],
                },
              },
            },
          ])
          .toArray();
        resolve(cartItems);
      } catch (error) {
        reject(error);
      }
    });
  },

  // counting cart items
  getCartCount: (userId) => {
    try {
      return new Promise(async (resolve, reject) => {
        let count = 0;
        let cart = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .findOne({ user: ObjectId(userId) });
        if (cart) {
          count = cart.products.length;
        }
        resolve(count);
      });
    } catch (error) {
      reject(error);
    }
  },

  //changing product quantity in cart
  changeProductQuantity: (details) => {
    details.count = parseInt(details.count);
    details.quantity = parseInt(details.quantity);
    return new Promise((resolve, reject) => {
      if (details.count == -1 && details.quantity == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: ObjectId(details.cart) },
            {
              $pull: { products: { item: ObjectId(details.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else {
        //incrementing items
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: ObjectId(details.cart),
              "products.item": ObjectId(details.product),
            },
            {
              $inc: { "products.$.quantity": details.count },
            }
          )
          .then((response) => {
            resolve({ status: true });
          });
      }
    });
  },
  // calculating total amount
  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let cart = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .findOne({ user: ObjectId(userId) });
        if (cart) {
          if (cart.products.length > 0) {
            let total = await db
              .get()
              .collection(collection.CART_COLLECTION)
              .aggregate([
                {
                  $match: { user: ObjectId(userId) },
                },
                {
                  $unwind: "$products",
                },
                {
                  $project: {
                    item: "$products.item",
                    quantity: "$products.quantity",
                  },
                },
                {
                  $lookup: {
                    from: collection.PRODUCT_COLLECTION,
                    localField: "item",
                    foreignField: "_id",
                    as: "product",
                  },
                },
                // converting product array to object
                {
                  $project: {
                    item: 1,
                    quantity: 1,
                    image: 1,
                    product: { $arrayElemAt: ["$product", 0] },
                  },
                },

                {
                  $group: {
                    _id: null,
                    total: {
                      $sum: { $multiply: ["$quantity", "$product.price"] },
                    },
                  },
                },
              ])
              .toArray();

            resolve(total[0].total);
          } else {
            let total = [{ total: 0 }];
            resolve(total[0].total);
          }
        } else {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  //order placing
  placeOrder: (order, products, total) => {
    return new Promise(async (resolve, reject) => {
      // console.log(order,products,total);
      const status = order["payment-method"] === "COD" ? "placed" : "pending";
      let dateIso = new Date();
      let date = moment(dateIso).format("YYYY/MM/DD");
      let time = moment(dateIso).format("HH:mm:ss");
      moment().format("MMMM Do YYYY, h:mm:ss a");
      moment(date).format("MM/DD/YYYY");

      const orderObj = {
        deliveryDetails: {
          name: order.name,
          mobile: parseInt(order.mobile),
          address: order.address,
          pincode: parseInt(order.pincode),
          city: order.city,
          state: order.state,
        },
        userId: ObjectId(order.userId),
        paymentMethod: order["payment-method"],
        products: products,
        totalAmount: parseInt(total),
        status: status,
        date: date,
        time: time,
      };

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          //product deleting from cart after order placed
          db.get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: ObjectId(order.userId) });
          for (i = 0; i < products.length; i++) {
            db.get()
              .collection(collection.PRODUCT_COLLECTION)
              .updateOne(
                { _id: ObjectId(products[i].item) },
                {
                  $inc: { stock: -products[i].quantity },
                }
              );
          }

          resolve(response.insertedId);
        });
    });
  },

  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let cart = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .findOne({ user: ObjectId(userId) });
        resolve(cart.products);
      } catch (error) {
        reject(error);
      }
    });
  },

  //deleting from cart
  removeProduct: (details) => {
    return new Promise((resolve, reject) => {
      try {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: ObjectId(details.cart) },
            {
              $pull: { products: { item: ObjectId(details.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProducts: true });
          });
      } catch (err) {
        console.log(err);
      }
    });
  },

  generateRazorpay: (orderId, total) => {
    return new Promise((resolve, reject) => {
      const options = {
        amount: total * 100,
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, orders) {
        if (err) {
          console.log(err);
        } else {
          //console.log("new order:",orders);
          resolve(orders);
        }
      });
    });
  },

  //Razorpay verification

  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_ID);
      hmac.update(
        details["payment[razorpay_order_id]"] +
          "|" +
          details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      if (hmac == details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },
  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectId(orderId) },
          {
            $set: {
              status: "placed",
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  // for order details
  getOrderProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const orderItems = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                userId: ObjectId(userId),
              },
            },
            {
              $unwind: {
                path: "$products",
              },
            },
            {
              $lookup: {
                from: "product",
                localField: "products.item",
                foreignField: "_id",
                as: "result",
              },
            },
            {
              $unwind: {
                path: "$result",
              },
            },
            {
              $project: {
                orderStatus: 1,
                deliveryDetails: 1,
                productname: "$result.name",
                category: "$result.category",
                date: 1,
                time: 1,
                status: 1,

                price: "$result.price",
                quantity: "$products.quantity",
                product: "$products.item",
                orderStatus: "$products.orderStatus",
                isCancelled: "$products.isCancelled",
              },
            },
            {
              $sort: { date:-1},
            },
          ])
          .toArray();
        resolve(orderItems);
      } catch {
        reject(error);
      }
    });
  },

  showProduct: (proId) => {
    console.log(proId);
    return new Promise(async (resolve, reject) => {
      const product = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: ObjectId(proId) });
      resolve(product);
      // console.log(product);
    });
  },

  addToWishlist: (productId, userId) => {
    let proObj = {
      item: ObjectId(productId),
    };
    return new Promise(async (resolve, reject) => {
      try {
        let wishlist = await db
          .get()
          .collection(collection.WISHLIST_COLLECTION)
          .findOne({ user: ObjectId(userId) });
        if (wishlist) {
          let wishlistExist = wishlist.product.findIndex(
            (product) => product.item == productId
          );
          if (wishlistExist != -1) {
            resolve();
          } else
            db.get()
              .collection(collection.WISHLIST_COLLECTION)
              .updateOne(
                { user: ObjectId(userId) },
                {
                  $push: { product: { item: ObjectId(productId) } },
                }
              );
          resolve({ status: true });
        } else {
          let wishlistObj = {
            user: ObjectId(userId),
            product: [proObj],
          };
          await db
            .get()
            .collection(collection.WISHLIST_COLLECTION)
            .insertOne(wishlistObj)
            .then(() => {
              resolve({ status: true });
            });
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  getWishlistProduct: (userId) => {
    return new Promise(async (resolve, reject) => {
      products = await db
        .get()
        .collection(WISHLIST_COLLECTION)
        .aggregate([
          {
            $match: {
              user: new ObjectId(userId),
            },
          },
          {
            $unwind: {
              path: "$product",
            },
          },
          {
            $lookup: {
              from: "product",
              localField: "product.item",
              foreignField: "_id",
              as: "lookupProduct",
            },
          },
          {
            $unwind: {
              path: "$lookupProduct",
            },
          },
        ])
        .toArray();
      // console.log(products);
      resolve(products);
    });
  },
  //remove from wishlist
  removeWishlistProduct: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.WISHLIST_COLLECTION)
        .updateOne(
          {
            _id: ObjectId(details.wishlist),
          },
          {
            $pull: { product: { item: ObjectId(details.product) } },
          }
        )
        .then((response) => {
          //console.log(response);
          resolve(response);
        });
    });
  },

  directPayment: (proId) => {
    return new Promise(async (resolve, reject) => {
      try {
        productDetails = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .findOne({ _id: ObjectId(proId), isDeleted: false });
        resolve(productDetails);
        //console.log(productDetails);
      } catch (error) {
        reject(error);
      }
    });
  },

  // reset password-make sure user existing
  checkForgetPassword: (email) => {
    let response = {};
    return new Promise(async (resolve, reject) => {
      try {
        const userData = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .findOne({ email: email, isBlocked: false });
        if (userData) {
          resolve(userData);
        } else {
          console.log("invalid email");
          resolve();
        }
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  },

  newPassword: (data, password) => {
    console.log(data);

    return new Promise(async (resolve, reject) => {
      try {
        user = db
          .get()
          .collection(collection.USER_COLLECTION)
          .findOne({ email: data.email, isBlocked: false });
        if (user) {
          password.password = await bcrypt.hash(data.password, 10);
          db.get()
            .collection(collection.USER_COLLECTION)
            .updateOne(data)
            .then((data) => {});
        }
      } catch (error) {
        reject(error);
      }
    });
  },
  // filter
  filterProducts: (filter, price) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (filter.length > 1) {
          let filterProducts = db
            .get()
            .collection(collection.PRODUCT_COLLECTION)
            .aggregate([
              {
                $match: {
                  $or: filter,
                },
              },
              {
                $match: {
                  price: { $lt: price },
                },
              },
            ])
            .toArray();
          resolve(filterProducts);
        } else {
          let filterProducts = db
            .get()
            .collection(collection.PRODUCT_COLLECTION)
            .aggregate([
              {
                $match: {
                  price: { $lt: price },
                },
              },
            ])
            .toArray();
          resolve(filterProducts);
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  //order-Cancel
  userCancelOrder: (details) => {
    const { order, product } = details;
   

    return new Promise(async (resolve, reject) => {
      try {
        const cancel = await db
          .get()
          .collection(ORDER_COLLECTION)
          .updateOne(
            { _id: ObjectId(order), "products.item": ObjectId(product) },
            {
              $set: {
               
                "products.$.orderStatus": "order Cancelled",
                "products.$.isCancelled": "true",
"products.$.isInvoice":true
              },
            }
          );
       
        resolve();
        console.log("product cancelled successfully");
      } catch (error) {
        reject(error);
      }
    });
  },

  requestABook: (userId, request) => {
    return new Promise(async (resolve, reject) => {
      try {
        let requestOrder = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: ObjectId(userId) },
            {
              $push: {
                request: {
                  _id: ObjectId(userId),
                  ISBN13: request.ISBN13,
                  author: request.author,
                  email: request.email,
                  title: request.title,
                  quantity: parseInt(request.quantity),
                  number: parseInt(request.phone),
                  status: "pending",
                  cancel: "false",
                },
              },
            }
          );
        resolve(requestOrder);
      } catch (error) {
        reject(error);
      }
    });
  },

  //user-profile

  userProfile: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .findOne({ _id: ObjectId(userId) });

        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  },

  searchProducts: (key) => {
    return new Promise(async (resolve, reject) => {
      try {
        let products = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .find({
            $or: [
              {
                name: { $regex: key, $options: "i" },
              },
              {
                category: { $regex: key, $options: "i" },
              },
            ],
          })
          .toArray();
        resolve(products);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  },

  findAddress: (userId) => {
    let response = {};
    return new Promise(async (resolve, reject) => {
      try {
        const address = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .findOne({ userId: ObjectId(userId) });
        if (address) {
          resolve(address);
          // console.log(address);
        } else {
          resolve();
        }
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  },
  getRequestDetails: (userId) => {
    try {
      return new Promise(async (resolve, reject) => {
        const data = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .aggregate([
            {
              $match: {
                _id: ObjectId(userId),
              },
            },
            {
              $unwind: {
                path: "$request",
              },
            },
          ])
          .toArray();

        resolve(data);
      });
    } catch (error) {
      reject(error);
    }
  },

  //setting new password
  newPassword: (userId, password) => {
    return new Promise(async (resolve, reject) => {
      try {
        let newPass = await bcrypt.hash(password, 10);
        user = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: ObjectId(userId) },
            { $set: { password: newPass } }
          );
        console.log(user);
        resolve();
        console.log("password updated");
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  },
  // adding address for user profile
  addAddress: (userId, data) => {
    return new Promise(async (resolve, reject) => {
      try {
        address = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: ObjectId(userId) },
            {
              $push: {
                address: {
                  _id: ObjectId(userId),
                  street: data.street,
                  city: data.city,
                  state: data.state,
                  zip: parseInt(data.zip),
                  country: data.country,
                },
              },
            }
          );
        resolve(address);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  },
  //updating user profile address
  editAddress: (data, userId) => {
    const { street, city, state, zip, country } = data;
    return new Promise(async (resolve, reject) => {
      try {
        newData = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: ObjectId(userId), "address._id": ObjectId(userId) },
            {
              $set: {
                "address.$.street": street,
                "address.$.city": city,
                "address.$.state": state,
                "address.$.zip": zip,
                "address.$.country": country,
              },
            }
          );
        console.log(newData);
        resolve();

        console.log("address updated");
      } catch (error) {
        reject(error);
      }
    });
  },

  getOrderCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      try {
        let count = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .find({ userId: ObjectId(userId) })
          .count();
        resolve(count);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  },

  getUserAddress: (userId) => {
    try {
      return new Promise(async (resolve, reject) => {
        const address = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                userId: ObjectId(userId),
              },
            },
            {
              $sort: {
                date: -1,
              },
            },
            {
              $project: {
                deliveryDetails: 1,
              },
            },
            {
              $limit: 1,
            },
          ])
          .toArray();
        resolve(address);
      });
    } catch (error) {
      reject(error);
    }
  },

  //buy now
  getaproductAmount: (proId) => {
    try {
      return new Promise(async (resolve, reject) => {
        const buyNowProduct = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .findOne({ _id: ObjectId(proId) });
        resolve(buyNowProduct);
      });
    } catch (error) {
      reject(error);
    }
  },
  //buy now
  getPlaceOrder: (order, products, total) => {
    let Products = [
      {
        item: ObjectId(products._id),
        quantity: 1,
        orderStatus: "pending",
      },
    ];

    return new Promise(async (resolve, reject) => {
      // console.log(order,products,total);
      const status = order["payment-method"] === "COD" ? "placed" : "pending";
      let dateIso = new Date();
      let date = moment(dateIso).format("YYYY/MM/DD");
      let time = moment(dateIso).format("HH:mm:ss");
      moment().format("MMMM Do YYYY, h:mm:ss a");
      moment(date).format("MM/DD/YYYY");

      const orderObj = {
        deliveryDetails: {
          name: order.name,
          mobile: parseInt(order.mobile),
          address: order.address,
          pincode: parseInt(order.pincode),
          city: order.city,
          state: order.state,
        },
        userId: ObjectId(order.userId),
        paymentMethod: order["payment-method"],
        products: Products,
        totalAmount: total,
        status: status,
        date: date,
        time: time,
      };

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collection.PRODUCT_COLLECTION)
            .updateOne(
              { _id: ObjectId(Products[0].item) },
              {
                $inc: { stock: -1 },
              }
            );

          resolve(response.insertedId);
        });
    });
  },

  //invoice details
  getInvoiceData: (details) => {
    return new Promise(async (resolve, reject) => {
      try {
        const invoice = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                _id: ObjectId(details.order),
              },
            },
            {
              $unwind: {
                path: "$products",
              },
            },
            {
              $match: {
                "products.item": ObjectId(details.product),
              },
            },
            {
              $lookup: {
                from: "product",
                localField: "products.item",
                foreignField: "_id",
                as: "lookProduct",
              },
            },
            {
              $unwind: {
                path: "$lookProduct",
              },
            },
            {
              $project: {
                _id: 1,
                deliveryDetails: 1,
                products: 1,
                date: 1,
                time: 1,
                lookProduct: 1,
                total: {
                  $multiply: ["$products.quantity", "$lookProduct.price"],
                },
              },
            },
          ])
          .toArray();
        resolve(invoice);
      } catch (error) {
        reject(error);
      }
    });
  },
};