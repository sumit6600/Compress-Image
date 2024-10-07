const express  =  require('express');
const bodyParser  = require('body-parser');
const app = express()
const indexRoutes = require('./routes/index')
const mysql =  require('./config/db');
const cors = require('cors')
require('dotenv').config();
const PORT = process.env.PORT;
app.use(cors()); // Enable CORS for all routes

app.use(bodyParser.json({limit: '50mb',extended: true})); 
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.use('/auth' , indexRoutes)

app.listen(PORT , ()=>{
    console.log(`server is running on ${PORT}`)
})


process.on('SIGINT', async () => {
    try {
      await mysql.end();
      console.log('✅ MySQL pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error closing MySQL pool:', err);
      process.exit(1);
    }
  });


