import express from 'express';
import connectDB from './config/db.js';

import usersRoute from './routes/api/users.js';
import authRoute from './routes/api/auth.js';
import postsRoute from './routes/api/posts.js';
import profileRoute from './routes/api/profile.js';

const app = express();
const PORT = process.env.PORT || 5000;

// connect to database
connectDB();

// initialization middleware
app.use(express.json({ extended: false }));

app.get('/', (req, res) => res.send('💀💀💀'));

// defining the routes
app.use('/api/users', usersRoute);
app.use('/api/auth', authRoute);
app.use('/api/profile', profileRoute);
app.use('/api/posts', postsRoute);

app.listen(PORT, () => console.log('Server listening on PORT=' + PORT));
