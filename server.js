import express from 'express';
import connectDB from './config/db.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

app.get('/', (req, res) => res.send('💀💀💀'));

app.listen(PORT, () => console.log('Server listening on PORT=' + PORT));
