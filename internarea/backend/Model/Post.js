const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  authorName: String,
  authorPhoto: String,
  contentType: {
    type: String,
    enum: ["photo", "video"],
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  caption: String,
  likes: [
    {
      userId: String,
      likedAt: { type: Date, default: Date.now },
    },
  ],
  comments: [
    {
      userId: String,
      userName: String,
      userPhoto: String,
      text: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  shares: [
    {
      userId: String,
      sharedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Post", PostSchema);
