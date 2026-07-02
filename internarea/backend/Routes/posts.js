const express = require("express");
const router = express.Router();
const Post = require("../Model/Post");

// Check posting limit based on friend count
function getPostingLimit(friendCount) {
  if (friendCount === 0) return 0; // Cannot post
  if (friendCount >= 10) return Infinity; // Unlimited for 10+ friends
  return friendCount; // 1 post for 1 friend, 2 for 2 friends, etc.
}

// Check daily post count
async function getDailyPostCount(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const posts = await Post.countDocuments({
    userId,
    createdAt: { $gte: today },
  });

  return posts;
}

// Upload post
router.post("/upload", async (req, res) => {
  try {
    const { userId, contentType, fileUrl, caption, friendCount, authorName, authorPhoto } = req.body;

    const postingLimit = getPostingLimit(Number(friendCount ?? 0));

    if (postingLimit === 0) {
      return res.status(403).json({
        success: false,
        error: "You need at least 1 friend to post. Add friends to unlock posting.",
      });
    }

    const dailyPostCount = await getDailyPostCount(userId);
    if (dailyPostCount >= postingLimit) {
      return res.status(403).json({
        success: false,
        error: `You have reached your daily posting limit of ${postingLimit}. Try again tomorrow.`,
      });
    }

    const post = new Post({
      userId,
      authorName,
      authorPhoto,
      contentType,
      fileUrl,
      caption,
    });

    await post.save();

    res.json({ success: true, message: "Post uploaded successfully", post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get public space feed
router.get("/feed", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(50);

    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Like post (Toggle)
router.post("/:postId/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    const likeIndex = post.likes.findIndex((like) => like.userId === userId);
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
      await post.save();
      return res.json({ success: true, message: "Post unliked", likes: post.likes.length });
    } else {
      post.likes.push({ userId });
      await post.save();
      return res.json({ success: true, message: "Post liked", likes: post.likes.length });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Comment on post
router.post("/:postId/comment", async (req, res) => {
  try {
    const { userId, userName, userPhoto, text } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    post.comments.push({ userId, userName, userPhoto, text });
    await post.save();

    res.json({ success: true, message: "Comment added", comments: post.comments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Share post
router.post("/:postId/share", async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    post.shares.push({ userId });
    await post.save();

    res.json({ success: true, message: "Post shared", shares: post.shares.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete post
router.delete("/:postId", async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    if (post.userId.toString() !== userId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    await Post.deleteOne({ _id: req.params.postId });

    res.json({ success: true, message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
