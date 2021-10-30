const express = require('express')
const cors = require('cors')

const app = express()

// Config json response
app.use(express.json);

// Solve cors
app.use(cors({ credentials: true, origin: 'http://localhost:8080' }))

// Public folder for images
app.use(express.static('public'))

// Routes

app.listen(4000)