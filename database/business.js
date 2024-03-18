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

const table= ` CREATE TABLE businessprofile
    (id VARCHAR(256) PRIMARY KEY,
    Business_Name VARCHAR(256) NOT NULL,
    Email VARCHAR(256),
    Website VARCHAR(256) NOT NULL,
    Opening_hours VARCHAR(256),
    Location VARCHAR(256),
    Image VARCHAR(256), 
    Contact_Number VARCHAR(256),
    user_id VARCHAR(256),
    FOREIGN KEY (user_id) REFERENCES usersprofile(id))`

con.query(table,(err)=>{
    if(err)
    throw err;
    console.log("Table Created")
})