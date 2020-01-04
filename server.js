// Dependencies
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
// const favicon = require('serve-favicon');

// Requiring Note and Article models
const Note = require("./models/Note.js");
const Article = require("./models/Article.js");

// Scraping tools
const request = require("request");
const cheerio = require("cheerio");

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

//Define port
const port = process.env.PORT || 3000

// Initialize Express
const app = express();

// app.use(favicon(path.join(__dirname, 'public','images', 'favicon.ico')))

// Use body parser with our app
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make public a static dir
app.use(express.static("public"));

// Set Handlebars.
const exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");

// const connectionString = mongodb+srv://LS:Lysia14055@cluster0-fs2sx.mongodb.net/test?retryWrites=true&w=majority;
const databaseUri = "mongodb://<dbuser>:<dbpassword>@ds149279.mlab.com:49279/heroku_9mdm8fq1"

const connectionURI = process.env.MONGODB_URI ? process.env.MONGODB_URI  : databaseUri
mongoose.connect(connectionURI, {useNewUrlParser:true, useUnifiedTopology: true, useCreateIndex: true})


const db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// if logged in to the db through mongoose (log success message)
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

// Routes
// ======

//GET requests to render Handlebars pages
app.get("/", function(req, res) {
  Article.find({"saved": false}, function(error, data) {
    const hbsObject = {
      article: data
    };
    // console.log(hbsObject);
    res.render("home", hbsObject);
  });
});

app.get("/saved", function(req, res) {
  Article.find({"saved": true}).populate("notes").exec(function(error, articles) {
    const hbsObject = {
      article: articles
    };
    res.render("saved", hbsObject);
  });
});

// GET request to scrape the website
app.get("/scrape", function(req, res) {
  // grab the body of the html with request
  request("http://www.artparasites.com/", function(error, response, html) {

    const $ = cheerio.load(html);
  // console.log(html);
    $("article.loop").each(function(i, element) {


      // Save empty result object
      const result = {};

      result.category = $(element).children("header").children("h3").children("a").children("span").text();
      result.title = $(element).children("header").children("h2").children("a").text();
      result.image = $(element).children("section").children("a").children("img").attr("data-lazy-src");
      result.artist = $(element).children("section").children("p.caption").text();
      result.link = $(element).children("header").children("h3").children("a").attr("href");
      console.log(result)
      
      if (!result.image) return;
      
      const entry = new Article(result);

      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
        //  console.log(err);
        }
        // Or log the doc
        else {
         // console.log(doc);
        }
      });

    });
        res.send("Scrape Complete");

  });
});

// This will get the articles scraped from the mongoDB
app.get("/articles", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {

  Article.findOne({ "_id": req.params.id })
  // populate all of the notes associated with it
  .populate("note")
  // execute our query
  .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});


// Save an article
app.post("/articles/save/:id", function(req, res) {
      // Use the article id to find and update its saved boolean
      Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true})
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
});

// Delete an article
app.post("/articles/delete/:id", function(req, res) {
      // Use the article id to find and update its saved boolean
      Article.findOneAndUpdate({ "_id": req.params.id }, {"saved": false, "notes": []})
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
});


// Create a new note
app.post("/notes/save/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  const newNote = new Note({
    body: req.body.text,
    article: req.params.id
  });
  console.log(req.body)
  // And save the new note the db
  newNote.save(function(error, note) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's notes
      Article.findOneAndUpdate({ "_id": req.params.id }, {$push: { "notes": note } })
      // Execute the above query
      .exec(function(err) {
        // Log any errors
        if (err) {
          console.log(err);
          res.send(err);
        }
        else {
          // Or send the note to the browser
          res.send(note);
        }
      });
    }
  });
});

// Delete a note
app.delete("/notes/delete/:note_id/:article_id", function(req, res) {
  // Use the note id to find and delete it
  Note.findOneAndRemove({ "_id": req.params.note_id }, function(err) {
    // Log any errors
    if (err) {
      console.log(err);
      res.send(err);
    }
    else {
      Article.findOneAndUpdate({ "_id": req.params.article_id }, {$pull: {"notes": req.params.note_id}})
       // Execute the above query
        .exec(function(err) {
          // Log any errors
          if (err) {
            console.log(err);
            res.send(err);
          }
          else {
            // Or send the note to the browser
            res.send("Note Deleted");
          }
        });
    }
  });
});

// Listen on port
app.listen(port, function() {
  console.log("Server running on port " + port);
});
