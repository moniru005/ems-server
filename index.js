const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t2hcl8v.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db('emsDB').collection('users');
    const demoRequestCollection = client.db('emsDB').collection('demoRequest');

    //jwt API
    app.post("/jwt", async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "10h",
        });
        res.send({ token });
      });

    //middleware
    const verifyToken = (req, res, next) =>{
        console.log('inside verify token', req.headers.authorization);
        if(!req.headers.authorization){
            return res.status(401).send({message: 'Unauthorized Access'});
        }
        const token = req.headers.authorization.split(" ")[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
            if(err){
                return res.status(401).send({message: 'Unauthorized Access'});
            }
            req.decoded = decoded;
            next();
        })
    }

    //Verify Admin
    const  verifyAdmin = async(req, res, next) =>{
        const email = req.decoded.email;
        const query = {email: email};
        const user = await userCollection.findOne(query);
        if (!isAdmin) {
            return res.status(403).send({message: 'Forbidden Access'})
        }
        next();
    }


    //Users API 
    app.get('/users', verifyToken, async(req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
    })

    app.post('/users', async(req, res) =>{
        const user = req.body;
        const query = {email: user.email};
        const existingUser = await userCollection.findOne(query);
        if(existingUser){
            return res.send({message: "User already exists", insertedId: null});
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    app.get('/demo-request', async(req, res) => {
        const result = await demoRequestCollection.find().toArray();
        res.send(result);
    })

    app.post('/demo-request', async(req, res) =>{
        const user = req.body;
        const query = {email: user.email};
        const existingUser = await demoRequestCollection.findOne(query);
        if(existingUser){
            return res.send({message: "Email already exists", insertedId: null});
        }
        const result = await demoRequestCollection.insertOne(user);
        res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) =>{
    res.send('Employee Management is running')
})

app.listen(port, () =>{
    console.log(`EMS is running in the port on: ${port}`);
})