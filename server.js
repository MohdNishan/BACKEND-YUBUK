
require('dotenv').config()

const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
let express = require('express');
let app = express();
const jwt = require("jsonwebtoken");
const jsonParser = bodyParser.json();
const twilio = require('twilio');
const otplib = require('otplib');
const multer = require('multer');
const { google } = require('googleapis');
const { OAuth2 } = google.auth
const cors = require('cors')


// const bcrypt = require("bcrypt");
app.use(express.json());

app.use(cors({ origin: "*" })); // enable CORS for all domains


// let user = {
//     name:"nishan",
//     email : "abc@gmail.com",
//     password : "112233"
// }



const mysql = require('mysql2');
const { oauth2 } = require('googleapis/build/src/apis/oauth2');
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "nishan",
    database: "yubuk"
})
con.connect((err) => {
    console.log(err)
    if (err) throw err;
})



// const dlt="DELETE FROM login WHERE id=0017f16c-68b8-4bcc-b03e-0fd9387aa149";
// con.query(dlt,(err)=>{
//     if(err)
//     throw err;
// // console.log("Deleted")
// })

// const update="UPDATE login SET email='abc123@gmail.com' WHERE id=uuid()";
// con.query(update,(err)=>{
//     if(err)
//     throw err;  
// console.log("Updated")
// })

// con.query(
//     "SELECT * FROM login",
//     function(err,res){
//         console.log(res);
//     })



// const addfield="ALTER TABLE businessprofile ADD COLUMN Location_url VARCHAR(256)";
// con.query(addfield,(err,result) =>{
//     if(err){
//         throw err;
//     }
//     console.log("Field Added")
// })


// const dltfield="ALTER TABLE login DROP COLUMN password";
// con.query(dltfield,(err,result) =>{
//     if(err){
//         throw err;
//     }
//     console.log("Field Deleted")
// })


// bcrypt.hash(password1, saltrounds,(err, hash) => {
//     // Store hash in your password DB.
// })

// bcrypt.compare(password1,(err, result) => {
//     // result == true
// });
// bcrypt.compare(password2,(err, result) => {
//     // result == false
// });




// app.post('/signup',async(req,res) => {
//     if(req.body.username==undefined || req.body.email==undefined || req.body.password==undefined){
//         res.json("All Fields are required");
//     }

//     const {username,email,password} = req.body;
//     const hash = await bcrypt.hash(password,10)

//     const check = ` SELECT * FROM login WHERE email = '${email}' `;
//     con.query(check, [email], (err, results) => {   
//     if (err) {
//       res.send('Server Error');
//     } else {
//       if (results.length > 0) {
//         res.json({message:"Email already exist"})
//       } else {
//         const insert = ` INSERT INTO login (id,username,email,password) VALUES('${uuidv4()}','${username}','${email}','${hash}') `;
//         con.query(insert, [email], (err,result) => {
//             console.log({err,result})
//           if (err) {
//             res.json({message:"Server error"});
//           } else {
//             res.json({message:"User registered successfully"})
//           }
//         });
//       }
//     }
//   });
// });






// app.post('/login',jsonParser,(req,res) =>{
//     console.log(true,req.body.email,req.body.password)
//     if(req.body.email==undefined || req.body.password==undefined){
//         res.send("All Fields are required");
//     }
//     const {email, password} = req.body;
//     const qr = ` SELECT * FROM login WHERE email='${email}' `;
//     con.query(qr,(err,result) =>{
//         console.log(result)
//         if(err || result.length==0){
//             return res.send("Login Failed")
//         }
//         else{
//             const resp = {
//                 id : result[0].id,
//                 email : result[0].email
//             }
//             bcrypt.compare(req.body.password, result[0].password, (err,response) => {
//                 if(err){
//                     return res.json("Error");
//                 }
//                 if(response){
//                     const token = jwt.sign(resp,"secret",{expiresIn:"10m"});
//                     res.json({auth:true,token:token});
//                 }
//                 return res.json({auth:"Incorrect password"});
//             })
//         } 
//     })
// })









const twilioacc = twilio(
    process.env.ACCOUNTSID, 
    process.env.AUTHTOKEN
);


app.post('/login', (req, res) => {
    const { mobilenumber } = req.body;
    const secret = otplib.authenticator.generateSecret();
    const OTP = otplib.authenticator.generate(secret);

    const expirationtime = new Date()
    expirationtime.setMinutes(expirationtime.getMinutes() + 5)


    con.query(` SELECT * FROM login WHERE mobile_number='${mobilenumber}' `, (err,result) => {
        if (err){
            res.status(500).json("Internal Server Error")
        }
        else{
            if (result.length > 0){

                con.query(` UPDATE login SET OTP='${OTP}', date='${expirationtime.toISOString()}' WHERE mobile_number='${mobilenumber}'` , (err,result) => {
                    if (err) {
                        res.status(400).json({ message: "Unable to log in", error_message: err})
                    }
                    else{
                        twilioacc.messages
                            .create({
                                body: ` Your OTP is: ${OTP} `,
                                to: `+91${mobilenumber}`,
                                from: "+12087824075",
                            })
                        // res.json (`OTP sent to ${mobilenumber}`)
                        res.json({ message: `OTP sent to ${mobilenumber}` });
                    }
                })
            }
            else{
                const Id = uuidv4()
                con.query(`INSERT INTO login(id, mobile_number, otp, date) VALUES ('${Id}', '${mobilenumber}', '${OTP}', '${expirationtime.toISOString()}')`, (err, result) => {
                    if (err) {
                        res.status(400).json({ message: 'Unable log In', error_message: err });
                    } else {
                        twilioacc.messages
                            .create({
                                body: ` Your OTP is: ${OTP} `,
                                to: `+91${mobilenumber}`,
                                from: "+12087824075",
                            })
                        // res.json (`OTP sent to ${mobilenumber}`)
                        res.json({ message: `OTP sent to ${mobilenumber}` });
                    }
                });
            }
        }
    })
});

// setInterval(() => {
//     const now = new Date().toISOString();
//     con.query(`DELETE FROM login WHERE date <= '${now}'`, (err, result) => {
//         if (err) {
//             console.error('Failed to delete expired OTPs:', err);
//         } else {
//             console.log('Expired OTPs deleted successfully');
//         }
//     });
// }, 60000);



app.post('/verify', (req, res) => {
    const { otp,mobilenumber } = req.body;

    con.query(` SELECT * FROM login WHERE otp = '${otp}' `, (err, results) => {
        if (results.length > 0) {
            
            const token = jwt.sign({
                id: results[0].id,
                phone: mobilenumber
            }, 'secret');
            res.send({ auth: 'Successfull', token: token });
        } else {
            res.status(404).json({ error: 'Invalid OTP' });
        }
    });
});


app.get('/authme',(req,res) =>{
    const token = req.headers["token"] 
    
        const decode = decodeJwt(token);
        // console.log(decode.phone)

        con.query(` SELECT * FROM usersprofile WHERE Mobile_Number='${decode.phone}' `,(err,result)=>{
            if (result.length > 0){
                res.send(result);
            }
            else{
                res.send({message: "User not found"})
                console.log("User not found")
            }
        })
})


app.get('/businessview/:businessId',(req,res) => {
    
    const businessId = req.params.businessId

    con.query(` SELECT * FROM businessprofile WHERE id='${businessId}' `,(err,result) => {
        if (err) {
            res.status(500).json("Internal server errror")
        }
        else{
            res.json(result)
        }
    })
})


app.get('/businesses/:userId',(req,res) => {
    
    const userId = req.params.userId
    // console.log(req)

    con.query(` SELECT * FROM businessprofile WHERE user_id='${userId}' `, (err,result) => {
        if (err) {
            res.status(500).json({err: "Internal server error"})
        }
        else {
            res.json(result)
        }
    })
})


app.post("/user", verifyToken,(req, res) => {

    if (!req.body.Name || !req.body.Mobile_Number) {
        return res.json("Name and Mobile Number are required");
    }
    const { Name, Email, Mobile_Number, DP, Address, Date_of_Birth } = req.body;

    con.query(` SELECT * FROM usersprofile WHERE Mobile_Number = '${Mobile_Number}' `, (err, results) => {
        if (err) {
            res.json({ message: 'Server Error', error_message: err })
        }

        if (results.length > 0) {
            res.status(400).json("Profile Already Exists")
        }
        else {
            con.query(` INSERT INTO usersprofile(id,Name,Email,Mobile_Number,DP,Address,Date_of_Birth)
            VALUES('${uuidv4()}','${Name}','${Email}','${Mobile_Number}','${DP}','${Address}','${Date_of_Birth}')`, (err, result) => {
                if (err) {
                    res.json({ message: 'Internal server error', error_message: err });
                }
                else {
                    res.status(201).send("Profile Created")
                }

            });
        }
    });
});


app.get("/user", verifyToken, (req, res) => {

    // console.log(req.admin)
    const { id } = req.body;

    con.query(` SELECT * FROM usersprofile WHERE id = '${id}' `, (err, result) => {
        if (err) {
            res.status(404).json({ message: "Internal server error", error_message: err });
            return;
        }
        if (result.length === 0) {
            res.send("User not found")
        }
        else {
            res.json(result[0]);
        }
    })
})



app.put("/user", verifyToken, (req, res) => {
    const { id, Name, Email, Mobile_Number, DP, Address, Date_of_Birth } = req.body;

    con.query(` SELECT * FROM usersprofile WHERE Mobile_Number='${Mobile_Number}' AND id='${id}' `, (err,result) =>{
        if(err){
            res.status(500).json("Internal server error")
        }
        else{
            if(result.length > 0){
                res.status(400).json("Profile already exists with this mobile number")
            }
            else{
                con.query(` UPDATE usersprofile SET
            Name='${Name}',
            Email='${Email}',
            Mobile_Number='${Mobile_Number}',
            DP='${DP}',
            Address='${Address}',
            Date_of_Birth='${Date_of_Birth}' 
            WHERE id ='${id}' `, (err, result) => {
                if (err) {
                    res.send("Internal Server Error")
                }
                else {
                    res.send("Profile Updated Successfully")
                }
            })
            }
        }
    } )
            
})


// Business CRUD //

app.post("/business", verifyToken, (req, res) => {
    // if(!req.body.Business_name || !req.body.Opening_hours || !req.body.Location || !req.body.Contact_number){
    //     return res.json({message: "All fields are required"});
    // }
    const { Business_Name, Email, Website, Opening_hours, Location, Image, Contact_Number,user_id } = req.body;
    
    con.query(` SELECT * FROM businessprofile WHERE Business_Name='${Business_Name}' `, (err,result) => {
        // if(err) {
        //     res.status(500).json("Internal server error")
        // }
        // else {
            if(result.length > 0) {
                res.status(400).json("Business with this name already exist")
            }
            if (result.length === 0){
                // console.log(result)
                con.query(` INSERT INTO businessprofile(id,Business_Name,Email,Website,Opening_hours,Location,Image,Contact_Number,user_id) 
                VALUES('${uuidv4()}',
                '${Business_Name}',
                '${Email}',
                '${Website}',
                '${Opening_hours}',
                '${Location}',
                '${Image}',
                '${Contact_Number}',
                '${user_id}') `, (err, result) => {
                    // console.log(result,err)
                    if (err) {
                        res.status(500).json({message:"Internal server error", error_message:err})
                    }
                    else {
                        res.json("Business Added")
                    }
                })
            }
            
              
            
        // }
    })
})



app.get("/business", verifyToken, (req, res) => {

    const { id } = req.body;
    con.query(` SELECT * FROM businessprofile WHERE id='${id}' `, (err, result) => {
        if (err) {
            res.status(500).json({ message: "Internal server error" })
        }
        if (result.length === 0) {
            res.json("User not found")
        }
        else {
            res.json(result[0])
        }
    })
})




app.put("/business/:businessId", verifyToken, (req, res) => {

    const businessId = req.params.businessId

    const { Business_Name, Email, Website, Opening_hours, Location, Image, Contact_Number } = req.body;

                con.query(` UPDATE businessprofile SET
                Business_Name='${Business_Name}',
                Email='${Email}',
                Website='${Website}',   
                Opening_hours='${Opening_hours}',
                Location='${Location}',
                Image='${Image}',
                Contact_Number='${Contact_Number}'
                WHERE id = '${businessId}' `, (err, result) => {
                    if (err) {
                        res.status(500).json({ message: "Internal server error", error_message: err })
                        console.log(err)
                    }
                    else {
                        res.json("Updated Successfully")
                    }
                })
            }
        
    )




app.delete("/business/:businessId", verifyToken, (req, res) => {

    const businessId = req.params.businessId

    con.query(` SELECT * FROM businessprofile WHERE id = '${businessId}' `,(err,result) => {
        // console.log(result[0].user_id)
        const user_id = result[0].user_id
        if (err) {
            res.status(500).json("Internal Server Error")
        }
        else {
            con.query(` DELETE FROM businessprofile WHERE id = '${businessId}' `, (err, result) => {
         
                if (err) {
                    res.status(500).json("Internal Server Error")
                }
                else {
                    res.json({message: "Deleted Successfully", user_id})
        
                }
            })
        }
    })
    
})

const decodeJwt = (token) => {
    try {
      return jwt.verify(token, "secret");
    } catch (err) {
      console.log("jwt decode error", err.message);
    }
  };


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

const upload = multer({ storage: storage });

app.post('/uploads', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    db.query('INSERT INTO usersprofile (DP) VALUES (?)', [filePath], (err, result) => {
        if (err) {
            console.error('Error uploading file:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json({ message: 'File uploaded successfully' });
        }
    });
});





function verifyToken(req, res, next) {
    const token = req.headers["token"]
    if (token == undefined) {
        res.send("No token provided")
    }
    
    jwt.verify(token, "secret", (err, decoded) => {
        console.log(decoded)
        if (err) {
            res.send("AUTHENTICATION FAILED")
        }
        else {
            req.token = decoded
            next()
        }
    })
}
// console.log(token)

// app.get('/confirm', verifyToken, (req, res) => {
//     console.log(req.token)
//     con.query(`SELECT * FROM login WHERE email='${req.token.email}'`, (err, result, fields) => {
//         if (err)
//             throw err;
//         // console.log(true,JSON.stringify(result))
//         res.json(result);
//     })
// })






const OAuth2Client = new OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
)

OAuth2Client.setCredentials({
    refresh_token:process.env.REFRESH_TOKEN
})

const calendar = google.calendar({ version: 'v3', auth: OAuth2Client })

const EventStartTime = new Date()
EventStartTime.setDate(EventStartTime.getDay() + 2)

const EventEndTime = new Date()
EventEndTime.setDate(EventEndTime.getDay() + 2)
EventEndTime.setMinutes(EventEndTime.getMinutes() + 45)

const event = {
    summary: 'Meeting with CEO',
    location: 'Kalamassery, Kochi, Kerala',
    description: 'Meeting with the CEO to discuss about the YUYBUK project',
    start: {
        dateTime: EventStartTime,
        timeZone: 'Asia/Kolkata',
    },
    end: {
        dateTime: EventEndTime,
        timeZone: 'Asia/Kolkata'
    },
    colorId: 1,
}

calendar.freebusy.query(
    {
        resource: {
            timeMin: EventStartTime,
            timeMax: EventEndTime,
            timeZone: 'Asia/Kolkata',
            items: [{ id: 'primary' }],
        }
    }, 
        (err,res) => {
            if(err)
            return console.error('Free busy query error:', err)

        const eventsArr = res.data.calendars.primary.busy
        // console.log(eventsArr.length,'hh3uhefu')

        if(eventsArr.length === 0 ){
        return calendar.events.insert(
            {calendarId: 'primary', resource: event}, 
            err =>{
                if (err)
                return console.error('Event creation error:', err)

                return console.log('Calendar Event Created')
            }
        )}

        return console.log('Sorry I am Busy')
        })









app.listen(2000, () => {
    console.log("Server running")
    // console.log(process.env.REFRESH_TOKEN)
})