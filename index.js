// Force usage of Redis 3.1.2 instead of 4.0.1 due to many tutorials still using v3, with v4 introducing a bunch of breaking changes
// (such as using the socket code block for createClient to harbor host/port, as well as requiring a redisClient.connect() line, among others)
// Force usage of connect-redis 5.1.0 instead of 6.0.0, presumably for similar reasons

const express = require("express");
const mongoose = require("mongoose");
const redis = require("redis");
const connectRedis = require("connect-redis");
const session = require("express-session");
const cors = require("cors");

const {
  MONGO_USER,
  MONGO_PASSWORD,
  MONGO_IP,
  MONGO_PORT,
  REDIS_HOST,
  REDIS_PORT,
  SESSION_SECRET,
} = require("./config/config");

const RedisStore = connectRedis(session);

// Configure Redis client
const redisClient = redis.createClient({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

redisClient.on("error", function (err) {
  console.log("Could not establish a connection with redis. " + err);
});

redisClient.on("connect", function () {
  console.log("Connected to redis successfully");
});

// Establish express routes
const postRouter = require("./routes/postRoutes");
const userRouter = require("./routes/userRoutes");

const app = express();

const mongoUrl = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_IP}:${MONGO_PORT}/?authSource=admin`;

const connectWithRetry = () => {
  mongoose
    .connect(mongoUrl)
    .then(() => console.log("Successfully connected to DB"))
    .catch((e) => {
      console.log(e);
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

app.enable("trust proxy");
app.use(cors());
//Configure session middleware
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // if true only transmit cookie over https
      httpOnly: true, // if true prevent client side JS from reading the cookie
      maxAge: 60000, // session max age in miliseconds
    },
  })
);

// This ensures that the body gets attached to the request object
app.use(express.json());

app.get("/", (req, res) => {
  res.send("<h2>Hi there..</h2>");
});

app.get("/test", (req, res) => {
  const sess = req.session;
  sess.something = "this is something";
  res.send("Successssss");
});

//localhost:3000/api/v1/posts
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/users", userRouter);

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  console.log(`Listening on port ${port}`);
});
