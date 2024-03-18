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
    console.log("Connected Successfully")
}) 

const table= ` CREATE TABLE usersprofile
    (id VARCHAR(256) PRIMARY KEY,
    Name VARCHAR(256) NOT NULL,
    Email VARCHAR(256),
    Mobile_Number VARCHAR(256) NOT NULL, 
    DP VARCHAR(256),
    Address VARCHAR(256),
    Date_of_Birth (DATE) `

con.query(table,(err)=>{
    if(err)
    throw err;
    console.log("Table Created")
})