import express from 'express';
import { check, validationResult } from 'express-validator';
import gravatar from 'gravatar';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import c from 'config';

import User from '../../models/User.js';

const router = express.Router();

// @route GET api/users
// @desc testing route
// @access public
router.get('/', (req, res) => {
	res.send('users route 🤵');
});

// @route POST api/users
// @desc register a new user
// @access public
router.post(
	'/',
	// validation middleware
	[
		check('name', 'Name is a required field.').not().isEmpty(),
		check('email', 'The email has an invalid format.').isEmail(),
		check('password', 'The password has less` than 8 characters.').isLength(
			{
				min: 8,
			},
		),
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
		const { name, email, password } = req.body;

		try {
			console.log('Request to register a new user : ' + email);
			// see if the user already exists, if does then send back an error
			let user = await User.findOne({ email });
			if (user) {
				console.log('! User already exists, could not register.');
				return res.status(400).json({
					errors: [{ msg: 'User already exists' }],
				});
			}
			console.log('| User does not exist, creating new user.');

			// get user's gravatar
			const avatar = gravatar.url(email, {
				s: '200',
				r: 'pg',
				d: 'mm',
			});
			console.log('| Grabbed user gravatar');

			// at this point we would like to create a new User object according to the mongoose schema described in models/User.js
			// the password is unhashed but that's fine because doing this doesnt actually save an instance of the user to the database
			user = new User({
				name,
				email,
				avatar,
				password,
			});

			// encrypt the password using bcrypt
			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(password, salt);

			// now save the user to the database
			await user.save();
			console.log('| User password encrypted and saved to database.');

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
					console.log('| User registered and logged in.');
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
