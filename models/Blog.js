const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comment: {
    type: String,
    required: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  authorName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: [200, 'Blog title cannot exceed 200 characters']
  },
   ccc: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: [200, 'Blog title cannot exceed 200 characters']
  },
  plantType: {
    type: String,
    required: [true, 'Plant type is required'],
    maxlength: [100, 'Plant type cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Blog content is required'],
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  cultivationTips: {
    type: String,
    required: [true, 'Cultivation tips are required'],
    maxlength: [2000, 'Cultivation tips cannot exceed 2000 characters']
  },
  author: {
    type: String, // CHANGED FROM ObjectId TO String
    required: [true, 'Author name is required'],
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  images: [{
    type: String,
    default: []
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comments: [commentSchema],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['published', 'draft'],
    default: 'published'
  },
  tags: [{
    type: String,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }]
}, {
  timestamps: true
});

// Add index for better performance
blogSchema.index({ title: 'text', content: 'text' });
blogSchema.index({ plantType: 1 });
blogSchema.index({ user: 1 });
blogSchema.index({ status: 1 });

module.exports = mongoose.model('Blog', blogSchema);