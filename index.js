const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    await client.connect();

    const userCollection = client.db('emsDB').collection('users');
    const demoRequestCollection = client.db('emsDB').collection('demoRequest');
    const employeesCollection = client.db('emsDB').collection('employees');


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
        const isAdmin = user?.role === "admin";
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

    app.delete("/users/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
      });

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


    app.get('/users/admin/:email', verifyToken, async(req, res) =>{
        const email = req.params.email;
        if(email !== req.decoded.email){
            return res.status(403).send({message: 'Forbidden Access'});
        }
        const query = {email: email};
        const user = await userCollection.findOne(query);
        let admin = false;
        let isHR = false;
        if(user){
            admin = user?.role === "admin";
            isHR = user?.role === "hr";
        }
        res.send({admin, isHR});
    })

    //Update to Admin role
    app.patch("/users/admin/:id", async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
            status: "verified"
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      });

    //Update to Verified Status
    app.patch("/users/verify/:id", async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            status: "verified"
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      });

    // HR API
  

    //Employee API
    // app.post('/employees', async(req, res) =>{
    //     const user = req.body;
    //     const query = {email: user.email};
    //     const existingEmployee = await employeesCollection.findOne(query);
    //     if(existingEmployee){
    //         return res.send({message: "Employee already exists", insertedId: null});
    //     }
    //     const result = await employeesCollection.insertOne(employee);
    //     res.send(result);
    // })

    // app.get('/users/employee/:email', verifyToken, async(req, res) =>{
    //     const email = req.params.email;
    //     if(email !== req.decoded.email){
    //         return res.status(403).send({message: 'Forbidden Access'});
    //     }
    //     const query = {email: email};
    //     const user = await userCollection.findOne(query);
    //     let employee = false;
    //     if(user){
    //         employee = user?.role === "employee";
    //     }
    //     res.send({employee});
    // })

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