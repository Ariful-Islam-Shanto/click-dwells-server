const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)


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

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
const wishlistCollection = database.collection('wishlist');
const offeredCollection = database.collection('offered');
const purchasedPropCollection = database.collection('purchased_properties');
const reviewsCollection = database.collection('reviews');

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

    //? Get all users
    app.get('/allUsers/:email', async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.find().toArray();
      res.send(result);
    })
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

    //? Update user role by admin
    app.patch('/updateUserRole/:id', async(req, res) => {
      const id = req.params.id;
      const role = req.query.role;
     
      const query = { _id : new ObjectId(id) };
      const updatedDoc = {
        $set : {
          role : role
        }
      }
      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    //? Delete User by admin
    app.delete('/deleteUser/:id', async(req, res) => {
      const id = req.params.id;
      const email = req.params.email;
      const query = { _id : new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })

    //? Service related api
    //? Get all agent properties.
    app.get('/properties/:email', async(req, res) => {
      const email = req.params.email;
      const query = { "agent.email" : email };
      const result = await propertiesCollection.find(query).toArray();
      res.send(result);
    })

    //? Get all properties for admin.
    app.get('/allProperties/:email', async(req, res) => {
      const email = req.params.email;
      const result = await propertiesCollection.find().toArray();
      res.send(result);
    })

    //? Get all the verified property
    app.get('/properties', async(req, res) =>{
      const status = req.query.status;
      const query = { status : status };
      const result = await propertiesCollection.find(query).toArray();
      res.send(result);
    } )

    //? Get single data by id
    app.get('/property/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id) };
      const result = await propertiesCollection.findOne(query);
      res.send(result);
    })

    //? Get user specific all wishlist property.
    app.get('/wishlist', async(req, res) => {
      const email = req.query.email;
      const query = { 'user.email' : email }
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    })

    //? Get user specific single wishlist property.
    app.get('/wishlist/:id', async(req, res) => {
      const id = req.params.id;
      const email = req.query.email;
      const query = { _id : new ObjectId(id) }
      const result = await wishlistCollection.findOne(query);
      res.send(result);
    })

    //? Get all offered property for agent
    app.get('/offeredProperty', async(req, res) => {
      const email = req.query.email;
      const query = { 'agent.email' : email };
      const result = await offeredCollection.find(query).toArray();
      res.send(result)
    })

    //? Get all offered property for agent
    app.get('/propertyBought', async(req, res) => {
      const email = req.query.email;
      const query = { 'buyer.email' : email };
      const result = await offeredCollection.find(query).toArray();
      res.send(result)
    })

    //? Get property bought by id
    //? Get all offered property for agent
    app.get('/propertyBought/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id) };
      const result = await offeredCollection.findOne(query);
      res.send(result)
    })

    //? Get sold properties for agent.
    app.get('/soldProperties', async (req, res) => {
      const email = req.query.email;
      const query = { "agent.email" : email };
      const result = await purchasedPropCollection.find(query).toArray();
      res.send(result);
    })


    //? Get all the reviews
    app.get('/reviews', async(req, res) => {
      const propertyId = req.query.id;
      const query = { reviewPropertyId : propertyId };
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    })

    //? Get user added reviews
    app.get('/myReviews', async(req, res) =>{
      const email = req.query.email;
      const query = { 'reviewer.email' : email };
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    })
    //? update offered property status to accepted or rejected
    app.put('/updateOfferedStatus/:id', async (req, res) => {
      const acceptedId = req.params.id;
      const status = req.query.status;
      
      console.log(acceptedId, status);
      if(!status || !acceptedId) {
        return res.send({message : 'no status found'})
      }
      
      const query = { _id : new ObjectId(acceptedId)}

      //? Find the accepted id data.
      const acceptedOfferData = await offeredCollection.findOne(query);

      if(!acceptedOfferData) {
        return res.status(404).send({ error: 'Offer not found' });
      }
  
      //? Now update the accepted offer status.
      await offeredCollection.updateOne(query, {
        $set : {
          status : status
        }
      })
      
       //? Now update the rest of the offer status as rejected only if the status is accepted.
      if(status === 'accepted') {
      const rejectedQuery =  { propertyId: acceptedOfferData.propertyId, _id: { $ne: new ObjectId(acceptedId) } }

      await offeredCollection.updateMany(rejectedQuery, {
        $set : {
          status : 'rejected'
        }
      })
      }
                               
      
      res.send({message : 'updated status'});
    })

    app.patch('/updatePropertyStatus/:id', async(req, res) => {
      const propertyId = req.params.id;
      const status = req.query.status;
      if(!status || !propertyId) {
        return res.send({message : 'No status found'})
      }

      const query = { _id : new ObjectId(propertyId) };
      const result = await propertiesCollection.updateOne(query, {
        $set : {
          status : status
        }
      })
      res.send(result);
    })

    //? Update property by agent
    app.patch('/updateProperty/:id', async(req, res) => {
      const id = req.params.id;
      const updatedProperty = req.body;
      const query = { _id : new ObjectId(id) };
      const updatedDoc = {
        $set : {
          ...updatedProperty
        }
      }
      const result = await propertiesCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    //? Save agent added property.
    app.post('/properties', verifyToken, async(req, res) => {
       const property = req.body;
       const result = await propertiesCollection.insertOne(property);
       res.send(result);
    })

    //? Save wishlist of user
    app.post('/wishlist', async(req, res) => {
       const property = req.body;

       //? Check if the property already exists
       const query = { propertyId : property.propertyId};
       const isExist = await wishlistCollection.findOne(query);
      //  console.log("Is the property exist ?", isExist);
       if(isExist) {
        return res.send({message : 'already exist'})
       }

       const result = await wishlistCollection.insertOne(property);
       res.send(result);
    })

    //? Save user offered property.
    app.post('/offeredProperty', async (req, res) => {
      const offeredProperty = req.body;
      const result = await offeredCollection.insertOne(offeredProperty);
      res.send(result);
    })

    //? Save reviews
    app.post('/reviews', async(req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    })

    //? Payment related api
    
    //? Stripe 
    //? generate client secret and send it to client side.
    app.post('/create-payment-intent', async(req, res) => {
      const price = req.body.price;
      console.log('price', price);
      const amount = parseFloat(price * 100);

      if(!price || !amount) {
        return;
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency : 'usd',
        payment_method_types : ['card']
      })
   
      res.send({clientSecret : paymentIntent.client_secret});
    })

    
    //? Save purchased property data into database
    app.post('/purchased-properties', async (req, res) => {
      const propertyInfo = req.body;
      const result = await purchasedPropCollection.insertOne(propertyInfo);
      res.send(result);
    })

    //? Update property bought status.
    app.patch('/updateBoughtStatus', async(req, res) => {
      const property = req.body;
      // console.log("updated the bought status", property.wishlistId, property.offeredId);

      //? update status on properties collection 
      const propertyQuery = { _id : new ObjectId(property.propertyId) };
      await propertiesCollection.updateOne(propertyQuery, {
        $set : {
          status : 'bought'
        }
      })

      //? update status on wishlist collection 
      const wishlistQuery = { _id : new ObjectId(property.wishlistId) };
      await wishlistCollection.updateOne(wishlistQuery, {
        $set : {
          status : 'bought'
        }
      })

      //? update status on offered collection 
      const offeredQuery = { _id : new ObjectId(property.offeredId) };
      await offeredCollection.updateOne(offeredQuery, {
        $set : {
          status : 'bought'
        }
      })

      res.send({message : "updated status"})
    })


    //? Delete wishlist property.
    app.delete('/deleteWishlist/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    })

    //? Delete agent property.
    app.delete('/deleteProperty/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const result = await propertiesCollection.deleteOne(query);
      res.send(result);
    })


    //? Delete review property.
    app.delete('/reviews/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const result = await reviewsCollection.deleteOne(query);
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