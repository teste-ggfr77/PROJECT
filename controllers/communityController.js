const Post = require('../models/Post');

exports.getCommunityPage = async (req, res) => {
    try {
        const posts = await Post.find().populate('user').populate('comments.user').sort({ createdAt: -1 });
        res.render('community', { posts });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).render('error', { error });
    }
};

exports.addPost = async (req, res) => {
    try {
        const { content } = req.body;
        const newPost = new Post({
            user: req.user._id,
            content,
            imageUrl: req.file ? req.file.path : ''
        });
        await newPost.save();
        res.redirect('/community');
    } catch (error) {
        console.error('Error adding post:', error);
        res.status(500).render('error', { error });
    }
};

exports.likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        post.likes++;
        await post.save();
        res.json({ likes: post.likes });
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ error: 'Error liking post' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Error deleting post' });
    }
};

exports.addComment = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const newComment = {
            user: req.user._id,
            content: req.body.content
        };
        post.comments.push(newComment);
        await post.save();
        const populatedPost = await Post.findById(post._id).populate('comments.user');
        res.json(populatedPost.comments[populatedPost.comments.length - 1]);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Error adding comment' });
    }
};
