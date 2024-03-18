
const mysql=require("mysql2");
const con=mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"nishan",
    database:"yubuk"
})
con.connect((err)=>{
    if(err)
    throw err;
    console.log("Connected Successfully...")
})

const table="CREATE TABLE login(id VARCHAR(256) PRIMARY KEY, mobile_number INT(14), OTP INT(6))"
con.query(table,(err)=>{
    if(err)
    throw err;
    console.log("Table Created")
})