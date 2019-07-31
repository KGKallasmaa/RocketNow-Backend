require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const mongoose = require('mongoose');
let cors = require('cors');
const ip = require("ip");



//Image upload
const multer = require("multer");
const cloudinary = require("cloudinary");
const cloudinaryStorage = require("multer-storage-cloudinary");


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_PUBLIC,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = cloudinaryStorage({
    cloudinary: cloudinary,
    folder: "good_pictures",
    allowedFormats: ["jpg", "png"],
    // transformation: [{ width: 500, height: 500, crop: "limit" }]
});
const parser = multer({storage: storage});


const graphQlSchema = require('./graphql/schema/index');
const graphQlResolvers = require('./graphql/resolvers/index');


//TODO: add process.env support
let app = express();
app.use(cors());
app.use(bodyParser.json());


app.post('/api/upload_images', parser.array("GoodImageFile"), (req, res) => {
    // console.log(req.files);
    res.send(req.files);
});


app.use(
    '/graphql',
    graphqlHttp({
        schema: graphQlSchema,
        rootValue: graphQlResolvers,
        graphiql: false
    })
);

app.use(function (err, req, res, next) {
    console.log('This is the invalid field ->', err.field);
    console.log('Error: ' + err);
    next(err)
});

console.log("testing mongodb user"+process.env.MONGO_USER);

console.log("testing mongodb "+process.env['MONGO_DB'])
mongoose
    .connect(
        `mongodb+srv://${process.env.MONGO_USER}:${
            process.env.MONGO_PASSWORD
            }@nonoline-pi73v.mongodb.net/${process.env.MONGO_DB}?retryWrites=true`
    )
    .then(() => {
        console.log('Successfully connected to the database.');
        const PORT = 3000;
        const HOST = ip.address();
        app.listen(PORT, HOST);
       // app.listen(PORT);
        console.log(`The backend is running on http://${HOST}:${PORT}`);
       // console.log(`The backend is running on:${PORT}`);
    })
    .catch(err => {
        console.log(err);
    });