import express from 'express';
import { check, validationResult } from 'express-validator';

import auth from '../../middleware/auth.js';
import Profile from '../../models/Profile.js';
import { isEmpty } from '../../util.js';

const router = express.Router();

// @route 		GET api/profile
// @desc 		get all profiles
// @access		Public
router.get('/', (req, res) => {
	res.send('profile route 🗿');
});

// @route	 	GET api/profile/me
// @desc		get the current user's profile (according to token)
// @access		private
router.get('/me', auth, async (req, res) => {
	// reached this stage, hence the token is valid and the corresponding user object from the database is present as req.user
	console.log(
		'Token verified, now looking for the profile object to send back.',
	);
	try {
		// grab the user object accessed during the middleware operation
		const { user } = req;
		// using the ID of the user, find a corresponding profile within the Profile collection (which was defined in models/Profile.js file) such that the "user" field of that Profile is the same as the ID of the user object we just received.
		// Also, before sending back the profile object back to the client, we would like to append the properties "name" and "avatar" from the user object to that profile object as well. The direct way to do that would just be to do profile.name = user.name and so on, but mongoose has a way to facilitate that too by using the "populate" function.
		const profile = await Profile.findOne({ user: user.id }).populate(
			'user',
			['name', 'avatar'],
		);
		if (!profile) {
			console.log('! Could not find a profile associated with the user.');
			return res
				.status(400)
				.json({ msg: 'No profile available for this user.' });
		}
		console.log('Profile found');
		return res.json(profile);
	} catch (error) {
		console.log("! Unable to send back the user's profile: " + error);
		res.status(500).send('server error.');
	}
});

// @route	 	POST api/profile
// @desc		create/update the current user's profile (according to token)
// @access		private
router.post(
	'/',
	[
		auth,
		[
			check('status', 'Status is a required field.').not().isEmpty(),
			check('skills', 'Skills is a required field.').not().isEmpty(),
		],
	],
	async (req, res) => {
		// reached this point, so auth was successful, now we need to do the validation logic
		console.log('Token verified, now trying to validate the data sent.');
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			console.log(
				"! Data isn't valid: " + errors.array().map(e => e.msg),
			);
			return res.status(400).json({ errors: errors.array() });
		}
		// if the function didnt enter the previous if clause, then the shape of the body provided in the request is as expected.
		// so the profile can be created accordingly.
		console.log(
			'| Data validation successful. Now attempting to create the profile object.',
		);
		const {
			company,
			website,
			location,
			bio,
			status,
			githubusername,
			skills,
			youtube,
			facebook,
			twitter,
			instagram,
			linkedin,
		} = req.body;

		// before appending these values to the profile object in the database, we must first verify if the value even exists.
		const profileFields = {};
		profileFields.user = req.user.id; //from the auth middleware
		if (company) profileFields.company = company;
		if (website) profileFields.website = website;
		if (location) profileFields.location = location;
		if (bio) profileFields.bio = bio;
		if (status) profileFields.status = status;
		if (githubusername) profileFields.githubusername = githubusername;
		if (skills) profileFields.skills = skills.split(',').map(s => s.trim());

		profileFields.social = {};
		if (facebook) profileFields.social.facebook = facebook;
		if (youtube) profileFields.social.youtube = youtube;
		if (twitter) profileFields.social.twitter = twitter;
		if (instagram) profileFields.social.instagram = instagram;
		if (linkedin) profileFields.social.linkedin = linkedin;
		if (isEmpty(profileFields.social)) delete profileFields.social;

		console.log(
			'| Profile object creation is complete. Now attempting to add the profile to database.',
		);
		console.log(profileFields);
		try {
			console.log(
				'| Checking to see if the profile already exists in the database.',
			);
			let profile = await Profile.findOne({ user: req.user.id });
			// if profile already exists by this ID, then we want to update it, otherwise we create a new one
			if (profile) {
				// update
				console.log(
					'| Profile found in the database, hence updating it.',
				);
				profile = await Profile.findOneAndUpdate(
					{ user: req.user.id },
					{ $set: profileFields },
					{ new: true },
				);

				console.log(
					'| Updated profile in the database, returning the final profile object back to the client.',
				);
				return res.json(profile);
			}

			// create
			console.log(
				'| Profile does not already exist in the database, so creating a new one.',
			);
			profile = new Profile(profileFields);
			await profile.save();
			console.log(
				'| New Profile created, now sending the object back to the client.',
			);
			return res.json(profile);
		} catch (error) {
			console.log('! Unable to add the profile to database.');
			res.status(500).send('Server unable to add profile to database.');
		}
	},
);

export default router;
