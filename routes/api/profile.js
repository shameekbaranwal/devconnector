import express from 'express';
import { check, validationResult } from 'express-validator';

import auth from '../../middleware/auth.js';
import Profile from '../../models/Profile.js';
import User from '../../models/User.js';
import { isEmpty } from '../../util.js';

const router = express.Router();

// @route 		GET api/profile
// @desc 		get all profiles
// @access		public
router.get('/', async (req, res) => {
	try {
		// the populate function takes in a field's name as the first parameter which should be of the type MongoID
		// it looks for a document with that ID, it grabs the fields mentioned in the second parameter from that document,
		// and conjoins those fields within the first parameter field in the original doc, and sends the whole thing back.
		console.log('| Trying to get data of all profiles from database.');
		const profiles = await Profile.find().populate('user', [
			'name',
			'avatar',
		]);
		console.log(
			'| Got all profiles from database, sending them back to client.',
		);
		res.json(profiles);
	} catch (error) {
		console.error('! Unable to return profiles of all users - ' + errors);
		res.status(500).send('Server error.');
	}
});

// @route	 	GET api/profile/me
// @desc		get the current user's profile (according to token)
// @access		private
router.get('/me', auth, async (req, res) => {
	// reached this stage, hence the token is valid and the corresponding user object from the database is present as req.user
	console.log('Looking for the profile object to send back.');
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
			console.error(
				'! Could not find a profile associated with the user.',
			);
			return res
				.status(400)
				.json({ msg: 'No profile available for this user.' });
		}
		console.log('| Profile found');
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
			console.error('! Unable to add the profile to database.');
			res.status(500).send('Server unable to add profile to database.');
		}
	},
);

// @route	 	GET api/profile/user/:user_id
// @desc		get profile of a specific user by his ID
// @access		public
router.get('/user/:user_id', async (req, res) => {
	try {
		console.log(
			`| Trying to get a profile with ID = ${req.params.user_id} from the database.`,
		);
		const profile = await Profile.findOne({ user: req.params.user_id });
		if (!profile) {
			console.log(
				`! Could not get a profile for user ${req.params.user_id}.`,
			);
			return res
				.status(400)
				.json({ errors: [{ msg: 'Profile not found.' }] });
		}
		console.log(`| Got the profile, sending back to client.`);
		res.json(profile);
	} catch (error) {
		console.error(
			`! Could not get profile for user ${$req.params.user_id} from the database. - ${error}`,
		);
		// in case the error is occurring because of the object ID not being of a valid format, then the profile.findOne will throw an error and cause the response to be "server error", which is wrong. so in that case we want to still say that profile is not found for that user. this can be implemented by:
		if (error.kind === 'ObjectId')
			return res
				.status(400)
				.json({ errors: [{ msg: 'Profile not found.' }] });

		res.status(500).send('Server error.');
	}
});

// @route 		DELETE api/profile
// @desc 		delete the currently logged-in user's profile, user and posts
// @access		private
router.delete('/', auth, async (req, res) => {
	try {
		console.log(
			'| Trying to delete the user account & profile & posts of the current logged-in user - ' +
				req.user,
		);
		// await Posts.deleteMany({user: req.user.id})
		console.log('| Deleted posts.');
		await Profile.findOneAndRemove({ user: req.user.id });
		console.log('| Deleted profile.');

		await User.findOneAndRemove({ _id: req.user.id });
		console.log('| Deleted user.');

		console.log('| Deletion successful.');
		res.json({ msg: 'Profile deleted successfully.' });
	} catch (error) {
		console.error('! Unable to delete - ' + error);
		res.status(500).send('Server error.');
	}
});

// @route 		POST api/profile/experience
// @desc 		add an experience to the currently logged-in user's profile
// @access		private
router.post(
	'/experience',
	auth,
	[
		check('title', 'Title is a required field.').not().isEmpty(),
		check('company', 'Company is a required field.').not().isEmpty(),
		check('from', 'Starting date is a required field.').not().isEmpty(),
	],
	async (req, res) => {
		console.log(
			"Trying to add a new experience to the currently logged-in user's profile.",
		);

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			console.log('! Invalid data in body - ' + errors.array());
		}

		try {
			console.log('| Getting the profile document from the database.');
			const profile = await Profile.findOne({ user: req.user.id });
			if (!profile) {
				console.log('! No profile associated with the user.');
				return res.status(400).json({
					errors: [{ msg: 'No profile associated with the user.' }],
				});
			}

			const { title, company, location, from, to, current, description } =
				req.body;
			const newExperience = {
				title,
				company,
				location,
				from,
				to,
				current,
				description,
			};
			console.log('| Adding the new experience to the profile.');
			if (current) newExperience.to = Date.now();
			profile.experience.push(newExperience);
			profile.experience.sort((a, b) => b.to - a.to);
			console.log(profile.experience);

			console.log('| Updating the document in the database.');
			await profile.save();

			console.log('| Profile updated successfully.');
			res.json({ msg: 'Profile updated successfully.' });
		} catch (error) {
			console.log(
				'! Error in adding experience to the profile - ' + error,
			);
			res.status(500).send('Server error.');
		}
	},
);

// @route 		DELETE api/profile/experience
// @desc 		delete an experience from the currently logged-in user's profile
// @access		private
router.delete('/experience/:experience_id', auth, async (req, res) => {
	try {
		console.log(
			`Trying to delete experience ${req.params.experience_id} from the currently logged-in user's profile.`,
		);
		const { experience_id } = req.params;

		console.log('| Getting profile from the database.');
		const profile = await Profile.findOne({ user: req.user.id });
		const index = profile.experience
			.map(exp => exp.id)
			.indexOf(experience_id);
		if (index === -1) {
			console.log('! No experience found with that ID.');
			return res.status(400).json({
				errors: [
					{
						msg: `No experience found with the ID - ${experience_id}`,
					},
				],
			});
		}

		profile.experience.splice(index, 1);
		console.log('| Deleted experience from profile.');

		await profile.save();
		console.log('| Updated profile experiences in database.');

		res.send('Experience deleted successfully.');
	} catch (error) {
		console.log('! Could not delete the experience - ' + error);
		res.status(500).json({ errors: [{ msg: 'Server error.' }] });
	}
});

// @route 		POST api/profile/education
// @desc 		add an education to the currently logged-in user's profile
// @access		private
router.post(
	'/education',
	auth,
	[
		check('degree', 'Degree is a required field.').not().isEmpty(),
		check('school', 'School is a required field.').not().isEmpty(),
		check('from', 'Starting date is a required field.').not().isEmpty(),
		check('fieldofstudy', 'Field of Study is a required field.')
			.not()
			.isEmpty(),
	],
	async (req, res) => {
		console.log(
			"Trying to add a new education to the currently logged-in user's profile.",
		);

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			console.log('! Invalid data in body - ' + errors.array());
		}

		try {
			console.log('| Getting the profile document from the database.');
			const profile = await Profile.findOne({ user: req.user.id });
			if (!profile) {
				console.log('! No profile associated with the user.');
				return res.status(400).json({
					errors: [{ msg: 'No profile associated with the user.' }],
				});
			}

			const {
				school,
				degree,
				location,
				from,
				to,
				current,
				fieldofstudy,
				description,
			} = req.body;
			const newEducation = {
				school,
				degree,
				location,
				from,
				to,
				current,
				fieldofstudy,
				description,
			};

			console.log('| Adding the new education to the profile.');
			if (current) newEducation.to = Date.now();
			profile.education.push(newEducation);
			profile.education.sort((a, b) => b.to - a.to);
			console.log(profile.education);

			console.log('| Updating the document in the database.');
			await profile.save();

			console.log('| Profile updated successfully.');
			res.json({ msg: 'Profile updated successfully.' });
		} catch (error) {
			console.log(
				'! Error in adding education to the profile - ' + error,
			);
			res.status(500).send('Server error.');
		}
	},
);

// @route 		DELETE api/profile/education
// @desc 		delete an education from the currently logged-in user's profile
// @access		private
router.delete('/education/:education_id', auth, async (req, res) => {
	try {
		console.log(
			`Trying to delete education ${req.params.education_id} from the currently logged-in user's profile.`,
		);
		const { education_id } = req.params;

		console.log('| Getting profile from the database.');
		const profile = await Profile.findOne({ user: req.user.id });
		const index = profile.education
			.map(exp => exp.id)
			.indexOf(education_id);
		if (index === -1) {
			console.log('! No education found with that ID.');
			return res.status(400).json({
				errors: [
					{
						msg: `No education found with the ID - ${education_id}`,
					},
				],
			});
		}

		profile.education.splice(index, 1);
		console.log('| Deleted education from profile.');

		await profile.save();
		console.log('| Updated profile educations in database.');

		res.send('Education deleted successfully.');
	} catch (error) {
		console.log('! Could not delete the education - ' + error);
		res.status(500).json({ errors: [{ msg: 'Server error.' }] });
	}
});

// @route 		GET api/profile/github/:username
// @desc		get the five most recent GitHub repositories from the user's GitHub profile
// @access		public
router.get('/github/:username', async (req, res) => {
	const { username } = req.params;
});

export default router;
