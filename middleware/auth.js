import jwt from 'jsonwebtoken';
import c from 'config';

const auth = async (req, res, next) => {
	console.log('Running auth middleware : ');
	// grab the token from the header of the request
	const token = req.header('x-auth-token');
	if (!token) {
		console.log('! No token, could not authenticate user.');
		return res
			.status(401)
			.json({ msg: 'No token found, authorization denied.' });
	}

	// token exists, now verify it
	try {
		const decoded = jwt.verify(token, c.get('JWT_SECRET'));
		req.user = decoded.user;
		console.log('| Token verified, user authenticated.');
		next();
	} catch (error) {
		console.log('! Could not verify token, authorization denied.');
		return res.status(401).json({ msg: 'Invalid token.' });
	}
};

export default auth;
