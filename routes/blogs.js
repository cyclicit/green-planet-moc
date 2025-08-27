const express = require('express');
const Blog = require('../models/Blog');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all blogs
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 });
    
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single blog
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'name avatar');
    
    if (!blog) {
      return res.status(404).json({ msg: 'Blog not found' });
    }
    
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create blog
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, plantType, cultivationTips } = req.body;
    
    const blog = new Blog({
      title,
      content,
      plantType,
      cultivationTips,
      author: req.user.id
    });
    
    await blog.save();
    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like/Unlike blog
router.post('/:id/like', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ msg: 'Blog not found' });
    }
    
    const isLiked = blog.likes.includes(req.user.id);
    
    if (isLiked) {
      // Unlike
      blog.likes = blog.likes.filter(
        id => id.toString() !== req.user.id
      );
    } else {
      // Like
      blog.likes.push(req.user.id);
    }
    
    await blog.save();
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;