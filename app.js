import express from 'express'
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import ttl from 'mongoose-ttl';
import {EntityLimit} from "./constants/entityLimit.js";

const app = express();
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect('mongodb://localhost:27017/cacheDb');

const onReapCallback = () => {
    const newString = new RandomString({
        key: generateRandomString(7),
        data: generateRandomString(10),
    });
    newString.save((err) => {
        if (err)
            console.log(err);
    });
}

const stringSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    data: String,
});
stringSchema.plugin(ttl, {ttl: '5m', onReap: onReapCallback});


const RandomString = mongoose.model('String', stringSchema);

//Common routes
app.route('/randomStrings')
    //GET
    .get( (req, res) => {
        RandomString.find((error, foundStrings) => {
            if (!error) {
                foundStrings.forEach(string => string.resetTTL());
                res.send(foundStrings);
            } else {
                res.send(error);
            }
        });
    })
    //POST
    .post((req, res) => {
        //if entities limit reached, delete the oldest entity
       const entities = RandomString.find().sort({__ttl: -1});//find all, sort by ttl
       const id = entities.count((err, count) => {
           if (count === EntityLimit) {
               return entities[0]._id;
           }
       });//if limit reached return first entity id
       if (id) {
           RandomString.findByIdAndDelete(id);//delete the entity
       }
        const newString = new RandomString({
            key: req.body.key,
            data: req.body.data,
        });
        newString.save((err) => {
           handleResponse(res, err, 'Successfully added new entity');
        });
    })
    //Delete
    .delete((req, res) => {
        RandomString.deleteMany((err) => {
            handleResponse(res, err, 'Successfully deleted all entities');
        });
    });

//Specific routes
app.route('/randomStrings/:key')
    //GET
    .get((req, res) => {
        const key = req.params.key;
        RandomString.findOne({key}, (err, foundString) => {
            if (!err) {
                if (foundString) {
                    console.log('Cache hit');
                    foundString.resetTTL();
                    res.send(foundString);
                } else {
                    console.log('Cache miss');
                    const randomString = generateRandomString(10);
                    const newString = new RandomString({
                        key: key,
                        data: randomString,
                    });
                    newString.save((error) => {
                        if (!error) {
                            res.send(newString);
                        } else {
                            res.send(error);
                        }
                    });
                }
            } else {
                res.send(err);
            }
        });
    })
    //PUT
    .put((req, res) => {
       const key = req.params.key;
       RandomString.updateOne(
           {key: req.params.key},
           {key: req.body.key, data: req.body.data},
           {},
           (err) => {
              handleResponse(res, req, `Entity with ${key} key was successfully overwritten`)
           }
       );
    })
    //PATCH
    .patch((req, res) => {
        const key = req.params.key;
        RandomString.updateOne(
            {key: req.params.key},
            {$set: req.body},
            {},
            (err) => {
                handleResponse(res, err, `Entity with ${key} key was successfully updated`);
            }
        )
    })
    //DELETE
    .delete((req, res) => {
        const key = req.params.key;
        RandomString.deleteOne(
        {key},
        {},
        (err) => {
            handleResponse(res, err, `Entity with ${key} key was successfully deleted`);
        })
    });

const handleResponse = (response, err, message) => {
    if (!err) {
        response.send(message);
    } else {
        response.send(err);
    }
};

const generateRandomString = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() *
            characters.length));
    }
    return result;
};

app.listen(3000, () => console.log('Server started on port 3000'));
