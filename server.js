var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
require('dotenv').config();
// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = "mongodb://localhost/mongoHeadlines";
if (process.env.PORT) {
  MONGODB_URI = "mongodb://"+process.env.dbuser+":"+ process.env.dbpassword +"@ds243717.mlab.com:43717/heroku_gx29v159"
}
mongoose.connect(MONGODB_URI,{ useNewUrlParser: true });
// Routes

// A GET route for scraping the Hawaii news website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.mauinews.com/news/local-news/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("#full_category article").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(element)
        .find("h1")
        .text();
      result.link = $(element)
        .children("a")
        .attr("href");
      result.excerpt = $(element)
            .children("p")
            .text();

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
    });


    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.update({ _id: req.params.id })({ note: dbNote_id })
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .then(function(dbNote) {
      res.json(dbNote);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// app.delete("/articles/:id"), function(req, res) {
//   db.Article.destroy({
//     where: {
//       id: req.params.id
//     }
//   }).then(function() {
//     res.end();
//   })
// }

// app.get("/delete/:id", function(req, res) {
//   db.Article.remove(
//     {
//       id: req.params.id
//     },
//     function(error, removed) {
//       if (error) {
//         console.log(error);
//         res.send(error);
//       }else {
//         console.log(removed);
//         res.send(removed)
// ;      }
//     }
//   );
// });
app.get("/delete/:id", function(req, res) {
  db.Article.deleteOne(
    {
      id: req.params.id
    },
    function(error, removed) {
      if (error) {
        console.log(error);
        res.send(error);
      }else {
        console.log(removed);
        res.send(removed)
;      }
    }
  );
});
// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
