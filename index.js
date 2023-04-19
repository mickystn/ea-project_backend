const express = require("express");

// Middlewares
const app = express();

// Routes
app.get("/", (req,res)=>{
    res.send("พ่อมึงตาย")
});

// connection
app.listen(6969, () => console.log(`Listening to port kuy`));