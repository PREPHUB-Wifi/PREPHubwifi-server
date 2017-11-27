var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors'); 
count = 0;

const {Client} = require('pg');
var client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'prephubwifi',
  password: 'postgres',
  port: 5432,
});

client.connect((err) => {
  if (err) {
    console.error("Could not connect to database")
  } else {
    console.log("connected")
  }
});

app.use(bodyParser());
app.use(cors({origin: "*"})); 

app.get('/notes', function (req, res) {
  // send all of the notes
  console.log("GET request to /notes");
  //let query = "SELECT (name, source, status, created_at) FROM prephubwifi.all_reports";
  let query = `select array_to_json(array_agg(row_to_json(t)))
      from (
        select newName, needHelp, notes, time from prephubwifi.all_reports
      ) t`; 
  client.query(query)
    .then( (result) => {
      console.log("results: ");
      console.log(JSON.stringify(result.rows[0].array_to_json));
      let data = result.rows[0].array_to_json;
      let final = [];
      for (let row of data) { 
        temp = {
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
  console.log(req.body);
  response = {
    newName:req.body.newName,
    needHelp:req.body.needHelp,
    notes:req.body.notes,
    time:req.body.time,
  };

  var query = "INSERT INTO prephubwifi.all_reports (time, newName, needHelp, notes, source, status, lang, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";

  var values = [response.time, response.newName, response.needHelp, response.notes, 0, 'confirmed', 'en', {}];
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

function push_to_radio(response){
  var spawn = require('child_process').spawn,
    py    = spawn('python', ['compute_input.py',response]),
    dataString = '';
    py.stdout.on('data', function(response){
      dataString += JSON.stringify(response);
    });
    py.stdout.on('end', function(){
      console.log('Sum of numbers=',dataString);
    });

    py.stdin.write(JSON.stringify(response));
    py.stdin.end(); 
   // console.log(dataString);
}

var server = app.listen(8081, function () {
  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})
