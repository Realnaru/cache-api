import express from 'express'
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

const app = express();
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect('mongodb://localhost:27017/cacheDb');

const stringSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    data: String,
})

const RandomString = mongoose.model('String', stringSchema);

app.listen(3000, () => console.log('Server started on port 3000'));
