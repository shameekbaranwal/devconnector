import mongoose from 'mongoose';
import c from 'config';

const db = c.get('mongoURI');

const connectDB = async () => {
	try {
		await mongoose.connect(db, {
			useNewUrlParser: true,
		});

		console.log('connected to mongodb');
	} catch (error) {
		console.error('error in connecting to the database:\n' + error);
		process.exit(1);
	}
};

export default connectDB;
