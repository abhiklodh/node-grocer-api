const express = require('express');
const router = express.Router();
const db = require('../db');
const service = require('../services/stores.service');

const getCollection = function() {
    return db.getCollection('stores'); 
}

router.use(function timeLog(req, res, next) {
    console.log('Stores API called at : ', Date.now());
    next(); 
});

//
// GET - All stores or by id
//
router.get('/:storeId?', function(req, res){
    const collection = getCollection();

    let filter = {};

    if(req.params.storeId) {
        filter = { storeId: req.params.storeId }
    }

    collection.find(filter).toArray(function(err, docs) {
        res.json(docs);
    });
});

//
// POST - New Store
//
router.post('/', function(req, res){
    const collection = getCollection();

    collection.insertOne(req.body, function(err, result){
        res.send('OK');
    });
});

//
// POST - New Store Grocery
//
router.post('/:storeId/grocery', function(req, res){
    const collection = getCollection();
    const filter = { storeId: req.params.storeId }
    const grocery = req.body;
    
    collection.findOne(filter, function(err, store) {
        if(!store) {
            res.send('BAD!');
        }

        //
        // Find the category in the store if categories exist
        //
        let category = store.categories ? store.categories.find(c => { return c.name == grocery.category }) : [];
        
        //
        // If the category doesnt exist, create a new one
        //
        if(!category || category.length == 0) {
            category = { name: grocery.category ? grocery.category : "Uncategorized", groceries: [{ groceryName: grocery.groceryName, order: 1 }] };

            if(!store.categories) {
                store.categories = []
            }

            store.categories.push(category);
        } else {
            //
            // If the category exists, find the grocery
            //
            const existing = category.groceries.find(g => { return g.groceryName == grocery.groceryName });

            //
            // If it already exists, dont add it as a duplicate
            //
            if(existing) {
                res.send('duplicate grocery');
                return;
            }

            //
            // Get the max order and set the new grocery to that order + 1
            //
            const order = Math.max.apply(Math, category.groceries.map(function(g) { return g.order; }));
            grocery.order = order + 1;

            let newGrocery = { groceryName: grocery.groceryName, order: grocery.order };

            category.groceries.push(newGrocery);
        }

        //
        // Update the collection
        //
        var update = { $set: { categories: store.categories } };
        collection.updateOne(filter, update, function(err, doc) {
            res.send('OK');
        });
    });
});

//
// PUT - Store Grocery
//
router.put('/:storeId/grocery', function(req, res){
    const collection = getCollection();
    const filter = { storeId: req.params.storeId }
    const request = req.body;
    const current = request.currentGrocery;
    const updated = request.updatedGrocery;

    collection.findOne(filter, function(err, store) {
        if(!store) {
            res.send('BAD!');
        }

        //
        // Check if the grocery is moving up (close to the top) or down
        //
        const movingUp = updated.order < current.order;
        var category = store.categories.find(c => { return c.name == request.category });

        //
        // Update the groceries if the grocery is moving up
        //
        if (movingUp) {
            for(let i = 0; i < category.groceries.length; i++) {
                let g = category.groceries[i];

                if(g.order >= updated.order) {
                    g.order = g.order + 1;
                }
            }

            let currentGrocery = category.groceries.find(g => { return g.groceryName == current.groceryName });
            currentGrocery.order = updated.order;
        } else {
            for(let i = 0; i < category.groceries.length; i++) {
                let g = category.groceries[i];

                if(g.order <= updated.order) {
                    g.order = g.order - 1;
                }
            }

            let currentGrocery = category.groceries.find(g => { return g.groceryName == current.groceryName });
            currentGrocery.order = updated.order;
        }

        //
        // Update the collection
        //
        let updateFilter = { storeId: req.params.storeId, "categories.name": request.category };
        let update = { $set: { "categories.$.groceries": category.groceries } };

        collection.updateOne(updateFilter, update, function(err, doc) {
            res.send('OK');
        });
    });
});

//
// PUT - Store Category
//
router.put('/:storeId/category', function(req, res){
    const collection = getCollection();
    const filter = { storeId: req.params.storeId }
    const request = req.body;
    const current = request.currentCategory;
    const updated = request.updatedCategory;

    collection.findOne(filter, function(err, store) {
        if(!store) {
            res.send('BAD!');
        }

        //
        // Check if the grocery is moving up (close to the top) or down
        //
        const movingUp = updated.order < current.order;

        //
        // Update the groceries if the grocery is moving up
        //
        if (movingUp) {
            for(let i = 0; i < store.categories.length; i++) {
                let c = store.categories[i];

                if(c.order >= updated.order) {
                    c.order = c.order + 1;
                }
            }

            let currentCategory = store.categories.find(c => { return c.name == current.name });
            currentCategory.order = updated.order;
        } else {
            for(let i = 0; i < store.categories.length; i++) {
                let c = store.categories[i];

                if(c.order <= updated.order) {
                    c.order = c.order - 1;
                }
            }

            let currentCategory = store.categories.find(c => { return c.name == current.name });
            currentCategory.order = updated.order;
        }

        //
        // Update the collection
        //
        let update = { $set: { "categories": store.categories } };

        collection.updateOne(filter, update, function(err, doc) {
            res.send('OK');
        });
    });
});

module.exports = router;