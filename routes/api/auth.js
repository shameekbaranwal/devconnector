import express from 'express';
import { check, validationResult } from 'express-validator';
import c from 'config';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import User from '../../models/User.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

// @route	 GET api/auth
// @desc 	testing route - confirms that auth middleware is working
// @access 	protected
router.get('/', auth, async (req, res) => {
	// entered here => the auth middleware didnt encounter any error => the token is valid
	try {
		const user = await User.findById(req.user.id).select('-password');
		res.json(user);
	} catch (error) {
		console.log(
			'! Token verified, but could not retrieve corresponding data from the database.',
		);
		return res.status(500).json({ msg: 'Server error.' });
	}
});

// @route	POST api/auth
// @desc 	logging in
// @access 	public
router.post(
	'/',
	// validation middleware
	[
		check('email', 'The email has an invalid format.').isEmail(),
		check('password', 'The password is a required field.').exists(),
	],
	async (req, res) => {
		// validation logic
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			console.log(
				'Could not register the user : ' +
					errors.array().map(e => e.msg),
			);
			return res.status(400).json({ errors: errors.array() });
		}
		const { email, password } = req.body;

		try {
			console.log('Attempting to log the user in : ' + req.body.email);
			// see if the user already exists, if does then send back an error
			let user = await User.findOne({ email });
			if (!user) {
				console.log(`! User with email ${email} could not be found.`);
				return res.status(400).json({
					errors: [{ msg: 'No such user exists.' }],
				});
			}
			console.log('| User found in database, verifying password.');

			// now we would like to verify the sent password against the stored one
			const isMatch = await bcrypt.compare(password, user.password);
			if (!isMatch) {
				console.log('! Password is incorrect.');
				return res.status(400).json({
					errors: [{ msg: 'Password is incorrect.' }],
				});
			}
			console.log('| Password is valid.');

			// return jsonwebtoken (for the user to get logged in on the frontend right away after registration)
			const payload = {
				user: {
					// this ID will be the one appended to the user object upon addition to the databsase
					id: user.id,
				},
			};
			// sign the payload with the secret key to generate the full token
			jwt.sign(
				payload,
				c.get('JWT_SECRET'),
				{
					expiresIn: '24h',
				},
				(err, token) => {
					if (err) throw err;

					// send the token back to the user
					console.log('| User logged in.');
					res.json({ token });
				},
			);
		} catch (error) {
			console.error(
				'Could not register the user - ' + name + '\n' + error,
			);
			res.status(500).send('Unable to register user. Server error.');
		}
	},
);

export default router;
