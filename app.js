//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const { setTheUsername } = require("whatwg-url");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const port = 3000;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

main().catch((err) => console.log(err));

//mongodb://0.0.0.0:27017/secrets
async function main() {
  mongoose.connect(
    "mongodb+srv://sunjot:sunjot123@cluster0.zubwffy.mongodb.net/secrets",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );
}

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: Array,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      passReqToCallback: true,
    },
    function (request, accessToken, refreshToken, profile, done) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return done(err, user);
      });
    }
  )
);

app.get("/", function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/loginfailure", function (req, res) {
  res.render("loginfailure", { messages: req.session.messages });
});

app.get("/register", function (req, res) {
  res.render("register");
});

//
app.get("/register1", function (req, res) {
  res.render("register1");
});

app.get("/secrets", function (req, res) {
  if (req.isAuthenticated()) {
    User.find({ secret: { $ne: null } })
      .then(function (foundUsers) {
        res.render("secrets", { usersWithSecrets: foundUsers });
      })
      .catch(function (err) {
        console.log(err);
      });
  } else {
    res.redirect("/secrets1");
  }
});

app.get("/secrets1", function (req, res) {
  User.find({ secret: { $ne: null } })
    .then(function (foundUsers) {
      res.render("secrets1", { users1WithSecrets: foundUsers });
    })
    .catch(function (err) {
      console.log(err);
    });
});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

//
app.get("/submit1", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/register1");
  }
});

app.get("/logout", function (req, res) {
  req.logout(function () {
    res.redirect("/");
  });
});

app.post("/register", function (req, res) {
  User.register({ username: req.body.username }, req.body.password)
    .then(function (user) {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    })
    .catch(function (err) {
      res.redirect("/register");
    });
});

//
app.post("/register1", function (req, res) {
  User.register({ username: req.body.username }, req.body.password)
    .then(function (user) {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    })
    .catch(function (err) {
      res.redirect("/register1");
    });
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local", {
        failureRedirect: "/loginfailure",
        failureMessage: true,
      })(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/submit", function (req, res) {
  const submittedSecret = req.body.secret;
  User.findById(req.user._id)
    .then(function (foundUser) {
      foundUser.secret.push(submittedSecret);
      foundUser.save().then(function () {
        res.redirect("/secrets");
      });
    })
    .catch(function (err) {
      console.log(err);
    });
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
