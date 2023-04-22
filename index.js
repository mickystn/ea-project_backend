
const express = require("express");
const app = express();
const cors = require("cors");
const mysql = require("mysql2");
const zmq = require("zeromq");

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    user: "root",
    host: "eaprojectdb.csxxfbi7aaia.ap-southeast-1.rds.amazonaws.com",
    password: "mannmixx2110",
    database: "db",
  });
app.get("/user", (req, res) => {
  //เลือกมาหมดยกเว้น แอดมิน
  db.query("SELECT * FROM user  WHERE `user_name`!='admin'", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});



app.get("/transaction", (req, res) => {
  db.query(`SELECT * FROM transaction`, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.get("/port", (req, res) => {
  db.query(`SELECT * FROM port  `, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});


const responder = zmq.socket("rep");
responder.bind("api-ea.vercel.app:3030");
responder.on("message",function(msg){
  console.log(msg.toString());
  db.query('SELECT port_number FROM `port` WHERE `port_number`=?',
    [msg.toString()],
    (err, result) => {
      if(result.length==0){
        responder.send("Not Allow");
      }
      else{
        responder.send("Allow");
      }
    }
  )

  
})

const responderData = zmq.socket("rep");
responderData.bind("api-ea.vercel.app:7000");
responderData.on("message",function(msg){
  console.log(msg.toString());
  var profit = JSON.parse(msg.toString())[0].Profit;
  var portNumber = JSON.parse(msg.toString())[0].portNumber;
  var equity = JSON.parse(msg.toString())[0].Equity;
  var date = JSON.parse(msg.toString())[0].Date;
  var balance = JSON.parse(msg.toString())[0].Balance;
  db.query('INSERT INTO `transaction` (port_number,time,balance,equity,profit) VALUES (?,?,?,?,?)',
    [portNumber,date,balance,equity,profit],
    (err,result) => {
      if(err){
        responderData.send("Insert Failed");
        console.log("Insert Failed");
      }
      else{
        responderData.send("Insert Success");
        console.log("Insert Success");
      }
    }
  )
})

app.post("/test",(req, res) => {
  console.log("/test");
})

app.post("/register",(req,res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const port_number = req.body.port;

  db.query('SELECT * FROM `user` WHERE   `email`=?',
    [email],
    (err, result) => {
      if(err){
        res.send({err:err})
      }
      if (result.length==0) {
        db.query('SELECT * FROM `port` WHERE `port_number`=?',[port_number],(err,result)=>{
          if(err){
            res.send({err:err})
          }
          if (result.length==0) {
            db.query('INSERT INTO `user` (user_name,email,password) VALUES (?,?,?)',
            [username, email, password],
            (err, result) => {
              if(err){
                res.send({err:err});
              }
              else{
                console.log(password);
                db.query('SELECT user_id FROM `user` WHERE `user_name`=? AND `email`=?',
                  [username, email],
                  (err, result) => {
                    const user_id = result[0].user_id;
                    db.query('INSERT INTO `port` (user_id,port_number) VALUES (?,?)',
                      [user_id, port_number],
                      (err,result) => {
                        if(err){
                          res.send({err:err});
                        }
                        else{
                          res.send({msg:"registersuccess"});
                        }
                      }
                    );
                  }
                );
              }
            }
          );
          }else{
            res.send({msg:"Thisportnumberalreadyexists"});
          }
        }
        );
        //กรณียังไม่ได้สมัครสมาชิก
      }
      else{
        res.send({msg:"Thisuseralreadyexists"});
      }
    }
  );
  
});

app.post("/signin",(req,res) => {
  const email = req.body.email;
  const password = req.body.password;
  db.query('SELECT * FROM `user` WHERE `email`=? AND `password`=?',
    [email, password],
    (err, result) => {
      if(err){
        res.send({err:err})
      }
      if (result.length>0) {
        res.send(result);
      }
      else{
        res.send({error:"user not found"})
      }
    }
  );
});
app.post("/addport",(req,res) => {
  const Userid = req.body.Userid;
  const portnumber = req.body.portnumber;

  db.query('SELECT * FROM `port`  WHERE   `port_number`=?',portnumber,(err, result) => {
      if(err){
      console.log(err);
      }
      if (result.length==0) {
        //กรณียังไม่มีport numberนี้
        db.query('INSERT INTO `port`(user_id,port_number) VALUES (?,?)',[Userid,portnumber],(err, result) => {
            if(err){
              console.log(err);
            }
            else{
              console.log(portnumber);
              res.send({msg:"add port number success"});
            }
          }
        );
      }
      else{
        res.send({msg:"มีแล้ว"});
        
      }
    }
  );
  
});

app.get("/userid/:id",(req,res)=>{
  const portnum= req.params.id;
  db.query('SELECT * FROM `user` INNER JOIN `port` ON user.user_id=port.user_id WHERE port.port_number=?'
    ,portnum
    ,(err,result)=>{
      if(err){
        console.log(err);
      }
      else{
        res.send(result)
      }
    }
  )
})

app.delete("/deleteport/:id", (req, res) => {
  const portnum = req.params.id;
  console.log(portnum);
  db.query('SELECT `port_number` FROM `transaction` WHERE `port_number`=?',portnum,(err,result)=>{
    if (err) {
      console.log(err);
    } else {
      if(result.length!=0){
        db.query('DELETE FROM `transaction` WHERE `port_number`=?',portnum,(err,result)=>{
          if (err) {
            console.log(err);
          } else {
            res.send(result);
          }
        })
      }else{
        db.query("DELETE FROM `port` WHERE `user_id`=(SELECT `user_id` FROM `port` WHERE `port_number`=?)",portnum,(err, result) => {
          if (err) {
            console.log(err);
          } else {
            res.send(result);
          }
        }); 
      }
    }
  })
  //เชค port
  
});

app.delete("/deletetran/:id", (req, res) => {
  const portnum = req.params.id;
  console.log(portnum);
  //เชค tran
  db.query('SELECT port_number FROM transaction WHERE `port_number`=?',portnum,(err,result)=>{
    if (err) {
      console.log(err);
    } else {
      if(result.length!=0){
        db.query('DELETE FROM `transaction` WHERE `port_number`=?',portnum,(err,result)=>{
          if (err) {
            console.log(err);
          } else {
            res.send(result);
          }
        });
      }else{
        res.send(result);
      }
    }
  })
  
  
});

app.delete("/deleteuser/:id", (req, res) => {
  const userid = req.params.id;
  console.log(userid);

  db.query('SELECT `port_number` FROM `port` WHERE `user_id`=?',userid,(err,result)=>{
    if (err) {
      console.log(err);
    } else {
      if(result.length!=0){
        db.query('DELETE FROM `port` WHERE `user_id`=?',userid,(err,result)=>{
          if (err) {
            console.log(err);
          } else {
            res.send(result);
          }
        })
      }else{
        db.query('DELETE FROM `user` WHERE `user_id`=?',userid,(err,result)=>{
          if (err) {
            console.log(err);
          } else {
            res.send(result);
          }
        })
      }
    }
  })
  
});


app.delete("/deleteOneport/:id", (req, res) => {
  const portnum = req.params.id;
  console.log(portnum);
  db.query('DELETE FROM `port` WHERE port_number =?',portnum,(err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
  
});

app.put("/updateuUserinfo", (req, res) => {
  const userid = req.body.Userid;
  const name = req.body.Name;
  const email = req.body.email;

  db.query(
    "SELECT  `user_id` FROM `user` WHERE `email`=? AND `user_id`=? ",
    [email,userid],(err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log(result);
        //console.log(userid);
        if(result.length!=0 ){
          db.query(
            "UPDATE `user` SET `user_name`=?,`email`=? WHERE `user_id`=?",
            [name, email,userid],
            (err, result) => {
              if (err) {
                console.log(err);
              } else {
                res.send({msg:"update Success"});
              }
            }
          );
        }else{
          db.query(
            "SELECT  `user_id` FROM `user` WHERE `email`=?",
            [email],(err, result) => {
              if (err) {
                console.log(err);
              } else {
                console.log(result);
                if(result.length==0 ){
                  db.query(
                    "UPDATE `user` SET `user_name`=?,`email`=? WHERE `user_id`=?",
                    [name, email,userid],
                    (err, result) => {
                      if (err) {
                        console.log(err);
                      } else {
                        res.send({msg:"update Success"});
                      }
                    }
                  );
                }else{
                  res.send({msg:"This email already exists"});
                }
              }
            }
          );
        }
      }
    }
  );
  
});


app.listen(3001, () => {
  console.log("Yey, your server is running on port 3001");
});
