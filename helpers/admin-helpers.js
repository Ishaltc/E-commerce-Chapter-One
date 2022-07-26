const db = require("../config/connection");
const collection = require("../config/collection");
const bcrypt = require("bcrypt");
const { Long } = require("mongodb");
const { response } = require("../app");
const { ORDER_COLLECTION } = require("../config/collection");
const { NetworkContext } = require("twilio/lib/rest/supersim/v1/network");
const ObjectId = require("mongodb").ObjectId;


module.exports = {
  adLogin: (adminData) => {
    try{
    //console.log(adminData);
    return new Promise(async (resolve, reject) => {
      let response = {};
      let admin = await db
        .get()
        .collection(collection.ADMIN_COLLECTION)
        .findOne({ email: adminData.email });
      if (admin) {
        bcrypt.compare(adminData.password, admin.password).then((status) => {
          if (status) {
            console.log("admin success");
            response.status = true;
            success: true;
            resolve(response);
          } else {
            console.log(" admin failed");
            // response.status = false;
            // response.adminErr = true;
            resolve({ status: false });
          }
        });
      } else {
        console.log("admin again failed");
        response.status = false;
        resolve(response);
      }
    });
  }catch(error){
    reject(error)
  }
  },
  addCategory: (data) => {
    return new Promise((resolve, reject) => {
      // console.log(data);
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .insertOne({ name: data.name, isDeleted: false })
        .then((data) => {
          resolve(data);
        });
    });
  },
  viewCategory: () => {
    try {
      return new Promise(async (resolve, reject) => {
        let userInfo = await db
          .get()
          .collection(collection.CATEGORY_COLLECTION)
          .find({ isDeleted: false })
          .toArray();
        //console.log(userInfo);
        if (userInfo) resolve(userInfo);
        reject("its error");
      });
    } catch (error) {
      reject(error);
    }
  },
  // editing category name
  updateCategory: (cateId, cateDetails) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .updateOne(
          { _id: ObjectId(cateId) },
          {
            $set: {
              name: cateDetails.name,
            },
          }
        )
        .then((response) => {
          // console.log(response);
          resolve(response);
        });
    });
  },
  deleteCategory: (cateId) => {
    
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .updateOne({ _id: ObjectId(cateId) }, { $set: { isDeleted: true } })
        .then(() => {
          resolve()
        }).catch((error) => {
          reject(error)
        })
    });
  },

  
  addSubCatt: (data) => {
    if (data)
      return new Promise((resolve, reject) => {
        db.get()
          .collection(collection.SUBCATEGORY_COLLECTION)
          .insertOne({ name: data.name, isDeleted: false })
          .then((data) => {
            resolve(data);
          });
      });
  },
  viewSubCat: () => {
    return new Promise(async (resolve, reject) => {
      let subCatt = await db
        .get()
        .collection(collection.SUBCATEGORY_COLLECTION)
        .find({ isDeleted: false })
        .toArray();
      resolve(subCatt);
      console.log(subCatt);
    });
  },
  deleteSubCat: (subCat) => {
    //console.log(subCat);
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.SUBCATEGORY_COLLECTION)
        .updateOne({ _id: ObjectId(subCat) }, { $set: { isDeleted: true } })
        .then(() => {
          resolve();
        });
    });
  },
  blockUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne({ _id: ObjectId(userId) }, { $set: { isBlocked: true } })
        .then((response) => {
          resolve(response);
        });
    });
  },
  unBlockUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne({ _id: ObjectId(userId) }, { $set: { isBlocked: false } })
        .then((response) => {
          resolve(response);
        });
    });
  },

  addBanner: (data) => {
    return new Promise(async(resolve, reject) => {
      try{
    const data= await db.get()
        .collection(collection.BANNER_COLLECTION)
        .insertOne({
          banner: {
            tittle: data.tittle,
            tDescription: data.tittleDescription,
            isDeleted: false,
          },
        })
        
          resolve(data);
        
      }catch(error){
        reject(error)
      }
    });
  },

  //showing order details
  getallOrderItems: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const ordersItems = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $lookup: {
                from: "user",
                localField: "userId",
                foreignField: "_id",
                as: "lookupUser",
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
                as: "lookupProduct",
              },
            },
            {
              $unwind: {
                path: "$lookupUser",
              },
            },
            {
              $unwind: {
                path: "$lookupProduct",
              },
            },
            {
              $sort: { date: -1 },
            },
          ])
          .toArray();

        resolve(ordersItems);
      } catch (error) {
        reject(error);
      }
    });
  },

  changeDeliveryStatus: (data) => {
    const { orderId, productId, delivery } = data;

    return new Promise(async (resolve, reject) => {
      try {
        if (delivery == "delivered") {
          const deliveryStatus = await db
            .get()
            .collection(collection.ORDER_COLLECTION)
            .updateOne(
              { _id: ObjectId(orderId), "products.item": ObjectId(productId) },
              {
                $set: {
                  "products.$.orderStatus": delivery,
                  "products.$.isCancelled": true,
                },
              }
            );
          resolve(deliveryStatus);
        } else {
          const deliveryStatus = await db
            .get()
            .collection(collection.ORDER_COLLECTION)
            .updateOne(
              { _id: ObjectId(orderId), "products.item": ObjectId(productId) },
              {
                $set: {
                  "products.$.orderStatus": delivery,
                },
              }
            );
          resolve(deliveryStatus);
        }

        console.log("status Updated");
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
    
  },
  getUsersRequest: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const userRequest = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .aggregate([
            {
              $match: {
                _id: new ObjectId(userId),
              },
            },
            {
              $unwind: {
                path: "$request",
              },
            },
            {
              $project: {
                name: 1,
                request: 1,
              },
            },
          ])
          .toArray();
        resolve(userRequest);
        //console.log(userRequest);
      } catch (error) {
        reject(error);
      }
    });
  },

  // finding total revenue
  totalRevenue: () => {
    try {
      let Total = 0;
      return new Promise(async (resolve, reject) => {
        let total = await db
          .get()
          .collection(ORDER_COLLECTION)
          .aggregate([
            {
              $unwind: {
                path: "$products",
              },
            },
            {
              $project: {
                data: "$products.orderStatus",
                totalAmount: 1,
              },
            },

            {
              $match: {
                data: "delivered",
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: "$totalAmount",
                },
              },
            },
          ])
          .toArray();
        if (total[0]) {
          let newTotal = total[0].total;
          resolve(newTotal);
         
        } else {
          resolve(Total);
        }
      });
    } catch (error) {
      reject(error);
    }
  },

  // finding count of users
  totalUsersCount: () => {
    let count = 0;
    try {
      return new Promise(async (resolve, reject) => {
        const usersCount = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .count();
        resolve(usersCount);
      });
    } catch (error) {
      reject(error);
    }
  },
  totalSalesCount: () => {
    let totalSalesCount = 0;
    try {
      return new Promise(async (resolve, reject) => {
        const totalSalesCount = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $unwind: {
                path: "$products",
              },
            },
            {
              $project: {
                data: "$products.orderStatus",
              },
            },

            {
              $match: {
                data: "pending",
              },
            },
            {
              $group: {
                _id: null,
                count: {
                  $sum: 1,
                },
              },
            },
          ])
          .toArray();
      
       resolve(totalSalesCount)
      
      });
    } catch (error) {
      reject(error);
    }
  },

  totalProductCount: () => {
    let proCount = 0;

    try {
      return new Promise(async (resolve, reject) => {
        const proCount = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .count();
        resolve(proCount);
      });
    } catch (error) {
      reject(error);
    }
  },

  //counts of payment
  getPaymentCount: () => {
    let methods = [];
    return new Promise(async (resolve, reject) => {
      try {
        let codProducts = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                paymentMethod: "COD",
              },
            },
          ])
          .toArray();
        let codLen = codProducts.length;
        methods.push(codLen);

        let razorPayProducts = await db

          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                paymentMethod: "ONLINE",
              },
            },
          ])
          .toArray();
        let razorPayLen = razorPayProducts.length;
        methods.push(razorPayLen);
        resolve(methods);
       
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  },

  //getting all delivery status details

  getStatusDetails: () => {
    let orderStatus = [];
    return new Promise(async (resolve, reject) => {
      try {
        let placeProducts = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $unwind: {
                path: "$products",
              },
            },
            {
              $project: {
                data: "$products.orderStatus",
              },
            },

            {
              $match: {
                data: "pending",
              },
            },
          ])
          .toArray();
        let placedLen = placeProducts.length;
        orderStatus.push(placedLen);

        let shippedProducts = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $unwind: {
                path: "$products",
              },
            },
            {
              $project: {
                data: "$products.orderStatus",
              },
            },

            {
              $match: {
                data: "shipped",
              },
            },
          ])
          .toArray();
        let shippedLen = shippedProducts.length;
        orderStatus.push(shippedLen);

        let deliveredProducts = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $unwind: {
                path: "$products",
              },
            },
            {
              $project: {
                data: "$products.orderStatus",
              },
            },

            {
              $match: {
                data: "delivered",
              },
            },
          ])
          .toArray();
        let deliveredLen = deliveredProducts.length;
        orderStatus.push(deliveredLen);

        let cancelProducts = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $unwind: {
                path: "$products",
              },
            },
            {
              $project: {
                data: "$products.orderStatus",
              },
            },

            {
              $match: {
                data: "order Cancelled",
              },
            },
          ])
          .toArray();
        let cancelLen = cancelProducts.length;
        orderStatus.push(cancelLen);
        resolve(orderStatus);

        //console.log(orderStatus);
      } catch (error) {
        reject(error);
      }
    });
  },
  sendingMail:(data)=>{
   return new Promise (async(resolve,reject)=>{
    const sentMail= await db.get().collection(collection.USER_COLLECTION).findOne({})
   })

  }
};




















