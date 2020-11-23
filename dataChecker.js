const fs = require("fs");
const data = JSON.parse(fs.readFileSync('./data.json'));

if(process.argv[2] === undefined){
    console.log("UserId not provided");
    return;
}

const userId = process.argv[2];

if(!data.personal.some(data => data.id == userId)){
    console.log("User not found");
    return;
}

console.log(JSON.stringify(JSON.stringify(data.personal.filter(data => data.id == userId), null, 4)));