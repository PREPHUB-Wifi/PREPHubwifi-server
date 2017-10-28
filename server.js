var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');

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
  response = {
    first_name:req.query.first_name,
    last_name:req.query.last_name
  };

  console.log(response);
  res.end(JSON.stringify(response));
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

  var query = "INSERT INTO prephubwifi.all_reports (created_at, name, notes, source, status, lang, tags) VALUES ($1, $2, $3, $4, $5, $6, $7)";

  var values = [response.time, response.newName, response.notes, 0, 'confirmed', 'en', {}];
  client.query(query, values)
    .then(function() {
      console.log("Done inserting");
    })
    .catch(function() {
      console.log("Error inserting")
    });

  console.log(response);
  res.end(JSON.stringify(response));
})

var server = app.listen(8081, function () {
  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})
