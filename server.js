
require('dotenv').config()

const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const app = express();
const jwt = require("jsonwebtoken");
const jsonParser = bodyParser.json();
const twilio = require('twilio');
const otplib = require('otplib');
const { google } = require('googleapis');
const { OAuth2 } = google.auth
const cors = require('cors')
const multer = require('multer');
const admin = require("firebase-admin")


const mysql = require('mysql2');
const { oauth2 } = require('googleapis/build/src/apis/oauth2');
const { file } = require('googleapis/build/src/apis/file');
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




const serviceAccount = require("./yubuk_firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://yubuk-b1075.appspot.com"
});

const bucket = admin.storage().bucket();

const storage = multer.memoryStorage();
const upload = multer({storage: storage});





app.use(express.json());

app.use(cors({ origin: "*" }));


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

    if(!mobilenumber || mobilenumber.length < 10) {
        // console.log(mobilenumber.length)
        return res.status(401).json({message: "Enter a Valid Mobile Number"})
    }


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
                        // twilioacc.messages
                        //     .create({
                        //         body: ` Your OTP is: ${OTP} `,
                        //         to: `+91${mobilenumber}`,
                        //         from: "+12087824075",
                        //     })
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
                res.status(400).send({message: "User not found"})
                // console.log("User not found")
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



const uploadImage = (req,callback) => {
    // console.log(req.file)
    // if (!req.file){
    //     return callback("No file uploaded");
    // }
    
    const metadata = {
        metadata: {
            firebaseStorageDownloadTokens: uuidv4()
        },
        contentType: req.file.mimetype,
        cacheControl: "public, max-age=31536000"
    };

    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream({
        metadata: metadata,
        gzip:true
    })

    blobStream.on("error", err => {
        return callback("Unable to upload image");
    });

        blobStream.on("finish", () => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${blob.name}?alt=media&token=07a04d7b-db76-488d-9e4c-ebcae9a82d00`;
        callback(null, imageUrl);
    });
    
    blobStream.end(req.file.buffer)
}


const uploading = multer();

app.post("/user", verifyToken, uploading.single("DP"), (req, res) => {

    if (!req.body.Name || !req.body.Mobile_Number) {
        return res.status(204).json("Name and Mobile Number are required");
    }

    const { Name, Email, Mobile_Number, Address, Date_of_Birth } = req.body;

    con.query(` SELECT * FROM usersprofile WHERE Mobile_Number = '${Mobile_Number}' `, (err, results) => {
        if (err) {
            res.json({ message: 'Server Error', error_message: err })
        }

        if (results.length > 0) {
            res.status(400).json("Profile Already Exists")
        }
        else {
            uploadImage(req, (error,imageUrl) => {
                if(error) {
                    return res.status(500).json({error})
                }
            con.query(` INSERT INTO usersprofile(id,Name,Email,Mobile_Number,DP,Address,Date_of_Birth)
            VALUES('${uuidv4()}','${Name}','${Email}','${Mobile_Number}','${imageUrl}','${Address}','${Date_of_Birth}')`, (err, result) => {
                if (err) {
                    res.json({ message: 'Internal server error', error_message: err });
                }
                else {
                    res.status(201).send({message: "Profile Created"})
                }
            });
        })
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
            res.status(400).send("User not found")
        }
        else {
            res.json(result[0]);
        }
    })
})


app.put("/user", verifyToken, uploading.single("DP"),(req, res) => {
    const { id, Name, Email, Address, Date_of_Birth } = req.body;
    
    if (req.file) {
    uploadImage(req,(err,imageUrl) => {
        if (err) {
            // console.log(err)
            return res.status(500).json({err})
        }
        // console.log(imageUrl)
        con.query(`UPDATE usersprofile SET
            Name='${Name}',
            Email='${Email}',
            DP='${imageUrl}',
            Address='${Address}',
            Date_of_Birth='${Date_of_Birth}' 
            WHERE id ='${id}' `, (err, result) => {
                if (err) {
                    // console.log(err)
                    res.status(500).json({message:"Internal server error", error_message:err})
                }
                else {
                    res.send("Profile Updated Successfully")
                }
            }   
        )  
    })}
    else{
        con.query(`UPDATE usersprofile SET
        Name='${Name}',
        Email='${Email}',
        Address='${Address}',
        Date_of_Birth='${Date_of_Birth}' 
        WHERE id ='${id}' `, (err, result) => {
            if (err) {
                console.log(err)
                res.send("Internal Server Error")
            }
            else {
                res.send("Profile Updated Successfully")
            }
        }   
    )  
    }
})



// Business CRUD //

app.post("/business", verifyToken, uploading.single("Image"),(req, res) => {

    const { Business_Name, Email, Website, Opening_hours, Location, Contact_Number, user_id } = req.body;
    
    con.query(` SELECT * FROM businessprofile WHERE Business_Name='${Business_Name}' `, (err,result) => {
        // if(err) {
        //     res.status(500).json("Internal server error")
        // }
            if(result.length > 0) {
                res.status(400).json("Business with this name already exist")
            }
            if (result.length === 0){
                uploadImage(req, (error,imageUrl) => {
                    if(error) {
                        return res.status(500).json({error})
                    }
                    // console.log(result)
                    // console.log(imageUrl)
                con.query(` INSERT INTO businessprofile(id,Business_Name,Email,Website,Opening_hours,Location,Image,Contact_Number,user_id) 
                VALUES('${uuidv4()}',
                '${Business_Name}',
                '${Email}',
                '${Website}',
                '${Opening_hours}',
                '${Location}',
                '${imageUrl}',
                '${Contact_Number}',
                '${user_id}') `, (err, result) => {
                    if (err) {
                        res.status(500).json({message:"Internal server error", error_message:err})
                    }
                    else {
                        res.json("Business Added")
                    }   
                })
            })
        }
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


app.put("/business/:businessId", verifyToken, uploading.single("Image"),(req, res) => {

    const businessId = req.params.businessId

    const { Business_Name, Email, Website, Opening_hours, Location, Contact_Number } = req.body;

    if (req.file) {
        uploadImage(req,(err,imageUrl) => {
            if (err) {
                return res.status(500).json({err})
            }
            con.query(` UPDATE businessprofile SET
            Business_Name='${Business_Name}',
            Email='${Email}',
            Website='${Website}',
            Opening_hours='${Opening_hours}',
            Location='${Location}',
            Image='${imageUrl}',
            Contact_Number='${Contact_Number}'
            WHERE id = '${businessId}' `, (err, result) => {
                if (err) {
                    res.status(500).json({ message: "Internal server error", error_message: err })
                    console.log(err)
                }
                else {
                    res.send("Updated Successfully")
                }
            })
        })
    }
    else{
        con.query(` UPDATE businessprofile SET
            Business_Name='${Business_Name}',
            Email='${Email}',
            Website='${Website}',
            Opening_hours='${Opening_hours}',
            Location='${Location}',
            Contact_Number='${Contact_Number}'
            WHERE id = '${businessId}' `, (err, result) => {
                if (err) {
                    res.status(500).json({ message: "Internal server error", error_message: err })
                    console.log(err)
                }
                else {
                    res.send("Updated Successfully")
                }
            })
        }
})


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


function verifyToken(req, res, next) {
    const token = req.headers["token"]
    if (token == undefined) {
        res.send("No token provided")
    }
    
    jwt.verify(token, "secret", (err, decoded) => {
        // console.log(decoded)
        if (err) {
            res.send("AUTHENTICATION FAILED")
        }
        else {
            req.token = decoded
            next()
        }
    })
}


app.listen(2000, () => {
    console.log("Server running")
    // console.log(process.env.REFRESH_TOKEN)
})