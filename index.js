const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
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
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // client.connect();

    const userCollection = client.db("emsDB").collection("users");
    const demoRequestCollection = client.db("emsDB").collection("demoRequest");
    const reviewsCollection = client.db("emsDB").collection("reviews");
    const tasksCollection = client.db("emsDB").collection("tasks");
    const salariesCollection = client.db("emsDB").collection("salaries");
    const contactsCollection = client.db("emsDB").collection("contacts");

    //jwt API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10h",
      });
      res.send({ token });
    });

    //middleware
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    //Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    //Users API
    app.get("/users", verifyToken, async (req, res) => {

      const result = await userCollection.find().toArray();
      res.send(result);
    });



    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      let isHR = false;
      if (user) {
        admin = user?.role === "admin";
        isHR = user?.role === "hr";
      }
      res.send({ admin, isHR });
    });

    //Update to users
    app.patch("/users/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          email: item.email,
          image: item.image,
          designation: item.designation,
          bankAccount: item.bankAccount,
          phone: item.phone,
          company: item.company,
          salary: item.salary,
          role: item.role,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //Update to Admin role
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
          status: "verified",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //Update to HR role
    app.patch("/users/hr/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "hr",
          status: "verified",
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
          status: "verified",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //Update to Fired Status
    app.patch("/users/fired/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "Fired",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //Salary Pay
    app.post("/salaries", async (req, res) => {
      const salary = req.body;
      const result = await salariesCollection.insertOne(salary);
      res.send(result);
    });

    app.get("/salaries", async (req, res) => {
      const result = await salariesCollection.find().toArray();
      res.send(result);
    });

    // app.patch("/salaries/:id", async (req, res) => {
    //     const id = req.params.id;
    //     const filter = { _id: new ObjectId(id) };
    //     const updatedDoc = {
    //       $set: {
    //         status: "paid",
    //       },
    //     };
    //     const result = await userCollection.updateOne(filter, updatedDoc);
    //     res.send(result);
    //   });

    // Employee Task API
    app.post("/tasks", async (req, res) => {
      const task = req.body;
      const result = await tasksCollection.insertOne(task);
      res.send(result);
    });

    app.get("/tasks",verifyToken, async (req, res) => {
      const result = await tasksCollection.find().toArray();
      res.send(result);
    });

    app.delete("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tasksCollection.deleteOne(query);
      res.send(result);
    });

    //Reviews
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    //Demo Request
    app.get("/demo-request", async (req, res) => {
      const result = await demoRequestCollection.find().toArray();
      res.send(result);
    });

    app.post("/demo-request", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await demoRequestCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "Email already exists", insertedId: null });
      }
      const result = await demoRequestCollection.insertOne(user);
      res.send(result);
    });

    // contact api
    app.post("/contacts", async (req, res) => {
      const contact = req.body;
      const result = await contactsCollection.insertOne(contact);
      res.send(result);
    });

    //admin stats
    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
        const users = await userCollection.estimatedDocumentCount();
        res.send({users});
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Employee Management is running");
});

app.listen(port, () => {
  console.log(`EMS is running in the port on: ${port}`);
});
