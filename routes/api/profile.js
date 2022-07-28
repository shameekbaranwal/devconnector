import express from 'express';

const router = express.Router();

// @route GET api/profile
// @desc Testing route
// @access Public
router.get('/', (req, res) => {
	res.send('profile route 🗿');
});

export default router;
