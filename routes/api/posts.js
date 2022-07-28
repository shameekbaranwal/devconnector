import express from 'express';

const router = express.Router();

// @route GET api/posts
// @desc Testing route
// @access Public
router.get('/', (req, res) => {
	res.send('posts route 📫');
});

export default router;
