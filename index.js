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


//? Verify token
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
const usersCollection = database.collection('users');

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

    //? User api
    //? Save user
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email: email }
      const options = { upsert: true }
      const isExist = await usersCollection.findOne(query)
      console.log('Is user exist', isExist)
      if (isExist) {
        if(user?.status === 'Requested') {
          const result = await usersCollection.updateOne(query, {
            $set : { status : user?.status }
            },
            options
            )
          return  res.send(result);
        }else {
          return res.send(isExist)
        }
      } 

      const result = await usersCollection.updateOne(
        query,
        {
          $set: { ...user },
        },
        options
      )
      res.send(result)
    })

     //? Get user role
     app.get('/getRole/:email', async(req, res) => {
      const email = req.params.email;
      const query = { email : email };
      const result = await usersCollection.findOne(query);
      res.send(result)
    })

    //? Service related api
    //? Get all agent properties.
    app.get('/properties/:email', async(req, res) => {
      const email = req.params.email;
      const query = { "agent.email" : email };
      const result = await propertiesCollection.find(query).toArray();
      res.send(result);
    })

    //? Get all the verified property
    app.get('/properties', async(req, res) =>{
      const status = req.query.status;
      console.log(status);
      const query = { status : status };
      const result = await propertiesCollection.find(query).toArray();
      res.send(result);
    } )


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