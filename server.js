const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const request = require('request');
const cors = require('cors');

const app = express();
const PORT = 3000;
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const API_KEY = 'a1a22b31c604448fa2009592587d923d';

app.post('/convert', upload.single('webm'), (req, res) => {
  const filePath = req.file.path;

  request({
    url: "https://www.webm.to/apis/",
    method: 'get'
  }, (err, apiRes, body) => {
    if (err) return res.status(500).send("Error getting API URL");

    const api_url = JSON.parse(body).api;

    const formData = {
      'lang': 'en',
      'convert_to': 'mp4',
      'files': fs.createReadStream(filePath)
    };

    request({
      url: `${api_url}/v1/convert/`,
      method: 'post',
      headers: {
        'Authorization': API_KEY
      },
      formData: formData
    }, (err, convRes, convBody) => {
      if (err) return res.status(500).send("Error submitting file");

      const convData = JSON.parse(convBody);
      if (convData.error) return res.status(400).json(convData);

      res.json({ ...convData, api_url });
    });
  });
});

app.post('/check', (req, res) => {
  const { data, api_url } = req.body;

  request({
    url: `${api_url}/v1/results/`,
    method: 'post',
    formData: data
  }, (e, r, body) => {
    const result = JSON.parse(body);
    res.json(result);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
