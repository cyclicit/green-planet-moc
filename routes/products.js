const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Create product - handle single file upload
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('Request received for product creation');
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const { name, description, price, category, stock } = req.body;
    
    // Validate required fields
    if (!name || !description || !price || !category || !stock) {
      return res.status(400).json({ 
        msg: 'Please fill all required fields',
        missing: {
          name: !name,
          description: !description,
          price: !price,
          category: !category,
          stock: !stock
        }
      });
    }

    // Handle file upload
    let imagePath = null;
    if (req.file) {
      imagePath = req.file.path;
      console.log('Image saved at:', imagePath);
    }

    // Create product
    const product = new Product({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category: category.trim(),
      stock: parseInt(stock),
      images: imagePath ? [imagePath] : [],
      user: req.user.id
    });

    console.log('Product to save:', product);

    const savedProduct = await product.save();
    console.log('Product saved successfully:', savedProduct._id);

    // Populate user info
    await savedProduct.populate('user', 'name avatar');

    res.status(201).json({
      msg: 'Product created successfully',
      product: savedProduct
    });

  } catch (error) {
    console.error('Error creating product:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        msg: 'Validation error', 
        errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        msg: 'Product with this name already exists' 
      });
    }
    
    res.status(500).json({ 
      msg: 'Server error while creating product',
      error: error.message 
    });
  }
});

// Get all products - FIXED VERSION
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = { status: 'active' };
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const products = await Product.find(query)
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });
    
    // Fix image URLs for both development and production
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://green-planet-moc.onrender.com'
      : 'http://localhost:5000';
    
    const productsWithFixedUrls = products.map(product => ({
      ...product.toObject(),
      images: product.images.map(image => {
        if (!image) return null;
        // Replace backslashes with forward slashes for URLs
        const normalizedPath = image.replace(/\\/g, '/');
        // Remove any duplicate slashes
        const cleanPath = normalizedPath.replace(/(?<!:)\/\//g, '/');
        return `${baseUrl}/${cleanPath}`;
      }).filter(Boolean)
    }));
    
    res.json(productsWithFixedUrls);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      msg: 'Error fetching products',
      error: error.message 
    });
  }
});

// Get single product - FIXED VERSION
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('user', 'name avatar')
      .populate('reviews.user', 'name avatar');
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    // Fix image URLs for both development and production
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://green-planet-moc.onrender.com'
      : 'http://localhost:5000';
    
    const productWithFixedUrls = {
      ...product.toObject(),
      images: product.images.map(image => {
        if (!image) return null;
        const normalizedPath = image.replace(/\\/g, '/');
        const cleanPath = normalizedPath.replace(/(?<!:)\/\//g, '/');
        return `${baseUrl}/${cleanPath}`;
      }).filter(Boolean)
    };
    
    res.json(productWithFixedUrls);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ 
      msg: 'Error fetching product',
      error: error.message 
    });
  }
});

// REMOVE THIS DUPLICATE ROUTE - it's causing issues
// router.get('/', async (req, res) => {
//   try {
//     const products = await Product.find({ status: 'active' })
//       .populate('user', 'name avatar')
//       .sort({ createdAt: -1 });
    
//     res.json(products);
//   } catch (error) {
//     console.error('Error fetching products:', error);
//     res.status(500).json({ 
//       msg: 'Error fetching products',
//       error: error.message 
//     });
//   }
// });

module.exports = router;