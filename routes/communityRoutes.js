const express = require('express');
const router = express.Router();
const communityCtrl = require('../controllers/communityController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const adminAuth = require('../middleware/adminAuth');

router.get('/', communityCtrl.getCommunityPage);
router.post('/', auth, adminAuth, upload.single('image'), communityCtrl.addPost);
router.get('/:id/like', auth, communityCtrl.likePost);
router.get('/:id/delete', auth, communityCtrl.deletePost);
router.post('/:id/comment', auth, communityCtrl.addComment);

module.exports = router;
