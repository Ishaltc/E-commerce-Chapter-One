const db = require('../config/connection');
const collection = require('../config/collection')
const bcrypt = require('bcrypt');
const ObjectId = require('mongodb').ObjectId;
const fs = require('fs'); 
const { resolve } = require('path');
const { response } = require('../app');

module.exports = {
    // addProduct: (product) => {
    //     //console.log(product);
    //     //console.log(files);
    //     return new Promise(async (resolve, reject) => {
    //         let data = await db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product)
    //         //console.log(data);
    //         resolve(data.insertedId)

    //     })
    //inserting to db
    addProduct: (data,callback) => {
        return new Promise(async(resolve,reject)=>{
        db.get().collection(collection.PRODUCT_COLLECTION).insertOne( {
            "name": data.name,
            "author": data.author,
            "description": data.description,
            "stock": parseInt(data.stock),
            "price": parseInt( data.price),
            "discount":parseInt(data.discount),
            "category": data.category,
            "subcategory": data.subcategory,
            "isDeleted": false
        })
            .then((data) => {
                callback(data.insertedId)

            })
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({ "isDeleted": false }).toArray()
           //console.log(products);
            resolve(products)
        })
    },
    
    deleteProduct:(proId) => {
        //console.log(proId);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:ObjectId(proId) }, { $set: { "isDeleted": true} }).then((response) => {
                resolve()
            })

        })
    },
    getOneProductDetails:(prodId)=>{
        return new Promise(async(resolve,reject)=>{
            let product= await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(prodId)})
            resolve(product)
        })
        
    },
    updateProduct:(prodId,proDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).
            updateOne({_id:ObjectId(prodId)},{
                $set:{
                    "name": proDetails.name,
                    "author": proDetails.author,
                    "description": proDetails.description,
                    "stock":parseInt( proDetails.stock),
                    "price":parseInt( proDetails.price),
                    "discount":parseInt( proDetails.discount),
                    "category": proDetails.category,
                    "subcategory": proDetails.subcategory,
                }
            }).then((response)=>{
                resolve()
            })
        })
    },
    getNewProduct:()=>{
        return new Promise(async(resolve,reject)=>{
            const newProducts=await db.get().collection(collection.PRODUCT_COLLECTION).find().sort({$natural:-1}).limit(5).toArray()
            console.log(newProducts);
            resolve(newProducts)
        })
        
    }
  
}
 


