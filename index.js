const express = require('express');
const cors = require('cors');

const app = express();

// Config json response
app.use(express.json());

// Solve cors
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));

// Public folder for images
app.use(express.static('public'));

// Routes
const UserRoutes = require('./routes/UserRoutes');
const PetRoutes = require('./routes/PetRoutes');
const CategoryRoutes = require('./routes/CategoryRoutes');

app.use('/users', UserRoutes);
app.use('/pets', PetRoutes);
app.use('/categories', CategoryRoutes);

app.listen(4000);
