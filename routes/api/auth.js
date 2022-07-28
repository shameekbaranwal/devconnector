import express from 'express';

const router = express.Router();

// @route GET api/auth
// @desc Testing route
// @access Public
router.get('/', (req, res) => {
	res.send('auth route 🔐');
});

export default router;
