const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');

// Newsletter signup
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Check if email already exists
    const existingSubscriber = await Newsletter.findOne({ email: email.toLowerCase() });
    
    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email is already subscribed' 
        });
      } else {
        // Reactivate if previously unsubscribed
        existingSubscriber.isActive = true;
        existingSubscriber.subscribedAt = new Date();
        await existingSubscriber.save();
        
        return res.json({ 
          success: true, 
          message: 'Successfully resubscribed to newsletter!' 
        });
      }
    }

    // Create new subscriber
    const newSubscriber = new Newsletter({
      email: email.toLowerCase(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    await newSubscriber.save();

    res.json({ 
      success: true, 
      message: 'Successfully subscribed to newsletter!' 
    });

  } catch (error) {
    console.error('Newsletter signup error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already subscribed' 
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid email address' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Something went wrong. Please try again.' 
    });
  }
});

// Unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const subscriber = await Newsletter.findOne({ email: email.toLowerCase() });
    
    if (!subscriber) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email not found in our newsletter list' 
      });
    }

    subscriber.isActive = false;
    await subscriber.save();

    res.json({ 
      success: true, 
      message: 'Successfully unsubscribed from newsletter' 
    });

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Something went wrong. Please try again.' 
    });
  }
});

module.exports = router;