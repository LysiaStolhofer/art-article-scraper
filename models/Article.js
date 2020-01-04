// Require mongoose
const mongoose = require("mongoose");
const Note = require("./Note");
// Create Schema class
const Schema = mongoose.Schema;

// Create article schema
const ArticleSchema = new Schema({
  category: {
    type: String
  },
  title: {
    type: String
  },
  image: {
    type: String
  },
  artist: {
    type: String
  },
  link: {
    type: String
  },
  saved: {
    type: Boolean,
    default: false
  },
  notes: [{
     type: Schema.Types.ObjectId,
     ref: "Note"
  }]
});

// Create the Article model with the ArticleSchema
const Article = mongoose.model("Article", ArticleSchema);

// Export the model
module.exports = Article;