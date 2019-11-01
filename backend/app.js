const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const mongoose = require('mongoose');
const cors = require('cors');

const ip = require("ip");

//Adding cluster
const os = require('os');
const cluster = require('cluster');

//Code we run it we're in the master process
if (cluster.isMaster) {
    const nrOfCPUs = os.cpus().length;
    console.log("Server runs on " + nrOfCPUs + " CPUs");
    for (let i = 0; i < nrOfCPUs; i += 1) {
        cluster.fork()
    }
}
//Code to run if we're in a a worker process
else {
    //Inital setup
    let app = express();
    app.use(cors());
    app.use(bodyParser.json());

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


    const graphQlSchema = require('./graphql/schema');
    const graphQlResolvers = require('./graphql/resolverMerger');

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

    connectToDatabase();
    function connectToDatabase (){
        mongoose.connect(
            `mongodb+srv://${process.env.MONGO_USER}:${
                process.env.MONGO_PASSWORD
                }@nonoline-pi73v.mongodb.net/${process.env.MONGO_DB}?retryWrites=true`, {
                useNewUrlParser: true,
                useCreateIndex: true,
                useUnifiedTopology: true
            });

        console.log('Successfully connected to the database.');
        const PORT = 3000;
        const HOST = ip.address();
        app.listen(PORT, HOST);
        // app.listen(PORT);
        console.log(`Worker ${cluster.worker.id} is running on http://${HOST}:${PORT}`);
        // console.log(`The backend is running on:${PORT}`);

    }

}

// Listen for dying workers

cluster.on('exit', function (worker) {
    // Replace the dead worker,
    console.log('Worker %d died. It is getting replace', worker.id);
    cluster.fork();
});


