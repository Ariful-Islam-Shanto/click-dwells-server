const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();


app.use(cors({
    origin : ['http://localhost:5173'],
    credentials : true
}))
app.use(express.json())
app.use(cookieParser())

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  // console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.agg5tyw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const database = client.db('ClickDwells');
const propertiesCollection = database.collection('properties');

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    //? Auth related api jwt.
    app.post('/jwt', async(req, res) => {
        const user = req.body;
        const secret = process.env.ACCESS_TOKEN_SECRET;
        // console.log( 'Jwt for user', user);
        const token = jwt.sign(user, secret, {expiresIn : "1h"});
        // console.log(token, 'token');
        res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    
    //? Clear cookie
    app.post('/logout', async (req, res) => {
        const user = req.body;
        const token = req.cookies.token;
        // console.log(user, 'user has a token', token);
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
    })


    //? Service related api
    //? Save agent added property.
    app.post('/properties', verifyToken, async(req, res) => {
       const property = req.body;
       const result = await propertiesCollection.insertOne(property);
       res.send(result);
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', async(req, res) => {
    res.send(`Server is running on port ${port}`)
})

app.listen(port, () => {
    console.log(`Server is running on port ${5000}`);
})