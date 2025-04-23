const express = require('express');
const multer = require('multer');
const request = require('request');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Set up multer to store files in 'uploads' folder
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const API_KEY = 'a1a22b31c604448fa2009592587d923d';

// Endpoint to handle file upload and conversion
app.post('/convert', upload.single('webmFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // File path of the uploaded WebM file
    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    const convertTo = 'mp4'; // Desired output format (MP4)

    // Call the WebM to MP4 conversion API
    convertFiles([filePath], convertTo, (error, result) => {
        if (error) {
            return res.status(500).json({ success: false, message: 'Conversion failed' });
        }

        // Return the download URL of the converted file
        res.json({ success: true, mp4Url: result });
    });
});

// Function to handle API integration with WebM to MP4 service
function convertFiles(fileList, convertTo, callback) {
    // Get API URL
    request({ url: "https://www.webm.to/apis/", method: 'GET' }, function (err, res, body) {
        if (err) {
            return callback(err, null);
        }

        let apiUrl = JSON.parse(body).api;

        let formData = {
            'lang': 'en',
            'convert_to': convertTo
        };

        // Attach uploaded file to the request
        fileList.forEach((file) => {
            formData['files'] = fs.createReadStream(file);
        });

        // Make the conversion request
        request({
            url: `${apiUrl}/v1/convert/`,
            method: 'POST',
            formData: formData,
            headers: {
                "Authorization": "your-api-key-here", // Replace with your API key
                "Content-Type": "multipart/form-data",
            }
        }, function (err, res, body) {
            if (err) {
                return callback(err, null);
            }

            let data = JSON.parse(body);
            getResults(data, apiUrl, callback);
        });
    });
}

// Function to poll the conversion status and get results
function getResults(data, apiUrl, callback) {
    if (data.error) {
        return callback(data.error, null);
    }

    request({
        url: `${apiUrl}/v1/results/`,
        method: 'POST',
        formData: data
    }, function (err, res, body) {
        if (err) {
            return callback(err, null);
        }

        let response = JSON.parse(body);

        if (!response.finished) {
            // If the conversion is not finished, wait and retry
            setTimeout(function () {
                getResults(data, apiUrl, callback);
            }, 1000);
            return;
        }

        // Once conversion is finished, return the download URLs
        let downloadUrl = response.files[0].url;
        if (downloadUrl.startsWith('/')) {
            downloadUrl = downloadUrl.substring(1);
        }

        callback(null, `${apiUrl}/${downloadUrl}`);
    });
}

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
