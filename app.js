require('dotenv').config();

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors'); 
var querystring = require('querystring');
var http = require('http');
var request=require('request');
var crypto = require('crypto');


const {Client} = require('pg');
var client = new Client({
  user: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: 'prephubwifi',
  password: 'postgres',
  port: 5432,
});

client.connect((err) => {
  if (err) {
    console.error("Could not connect to database")
    console.error("On host: " + process.env.DB_HOST)
    throw new Error("Could not establish connection to db");
  } else {
    console.log("Connected to db!")
  }
});

app.use(bodyParser());
app.use(cors({origin: "*"})); 


//listen for new info being put into database 
//if new item is not from current prephub: 
      //compare newly added item to the one above it 
      //if packets are not 1 apart: 
          //sync pkts

//sync packets: 
   //get all of the records 
   //if new packet has 'lower' hash than older one
       //starting from end, traverse up the list until we can insert it in the appropriate spot 
   //if new packet has 'greater' hash than older one 
       //determine how many packets we are missing 
       //reach out to prephub that sent new information and ask them to send all missing packets


app.get('/notes', function (req, res) {
  // send all of the notes
  console.log("GET request to /notes");
  //let query = "SELECT (name, source, status, created_at) FROM prephubwifi.all_reports";
  let query = `select array_to_json(array_agg(row_to_json(t)))
      from (
        select pckt_id, hash, no_sync, newName, needHelp, notes, time from prephubwifi.all_reports
      ) t`; 
  client.query(query)
    .then( (result) => {
      console.log("results: ");
      console.log(JSON.stringify(result.rows[0].array_to_json));
      let data = result.rows[0].array_to_json;
      let final = [];
      for (let row of data) { 
        temp = { 
          pckt_id:row.pckt_id, 
          hash: row.hash,
          no_sync: row.no_sync,
          newName:row.newname,
          needHelp:row.needhelp,
          notes:row.notes,
          time:row.time,
        }; 
        final.push(temp);
      }
      res.end(JSON.stringify(final));
    }).catch( (err) => {
      res.end(JSON.stringify(err))
    });
})

app.post('/notes', function (req, res) {
  // Prepare output in JSON format 
  var hash_val = md5(); //Not accurate because the hash won't include the new information 
  console.log("" +  hash_val);
  response = { 
    hash: hash_val.substring(0,4),
    pckt_id:req.body.pckt_id, 
    no_sync: 0, //0 means that receiver should initiate a sync process
    newName:req.body.newName,
    needHelp:req.body.needHelp,
    notes:req.body.notes,
    time:req.body.time,
  };

  var query = "INSERT INTO prephubwifi.all_reports (time, hash, pckt_id, no_sync, newName, needHelp, notes, source, status, lang, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9,$10,$11)";

  var values = [response.time, response.hash, response.pckt_id, response.no_sync, response.newName, response.needHelp, response.notes, 0, 'confirmed', 'en', {}];
  client.query(query, values)
    .then(function() {
      console.log("Done inserting");
    })
    .catch(function() {
      console.log("Error inserting")
    });
  push_to_radio(response);
  console.log(response);
  res.end(JSON.stringify(response));
})

function push_to_radio(data){
  const postData = querystring.stringify(data);

  const options = {
    hostname: 'localhost',
    port: 8888,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  //'Access-Control-Request-Method': POST
  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
      console.log('No more data in response.');
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  }); 

  

  // write data to request body
  req.write(postData);
  req.end();

}

function md5() { 
  var data = [];
  let query = `select array_to_json(array_agg(row_to_json(t)))
      from (
        select pckt_id, hash, newName, needHelp, notes, time from prephubwifi.all_reports
      ) t`; 
  client.query(query)
    .then( (result) => {
      console.log("results: ");
      console.log(JSON.stringify(result.rows[0].array_to_json));
      let data = result.rows[0].array_to_json; 
      let final = [];
      for (let row of data) {  
        temp = { 
          pckt_id:row.pckt_id, 
          hash: row.hash,
          newName:row.newname,
          needHelp:row.needhelp,
          notes:row.notes,
          time:row.time,
        }; 
        final.push(temp); 
      }
      JSON.stringify("FINAL ARRAY" + final);
    }); 
    //console.log("FINAL ARRAY" + JSON.stringify(data));
    //return crypto.createHash('md5').update(data.toString()).digest('hex'); 
    return '0';
}

var server = app.listen(8443, function () {
  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})
