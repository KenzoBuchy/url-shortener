const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const sharp = require('sharp');

const app = express();

// Configurer Multer pour le stockage en mémoire
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const dynamoDb = new AWS.DynamoDB.DocumentClient(
  process.env.IS_OFFLINE && {
    region: "localhost",
    endpoint: "http://localhost:8000",
  }
);

const TABLE_NAME = process.env.DYNAMODB_TABLE;

const s3 = new AWS.S3({
  endpoint: `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

const BUCKET_NAME = process.env.MINIO_BUCKET;

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Vérifier que le fichier existe
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!req.body.text_up && !req.body.text_bottom) {
      return res.status(400).json({ message: 'Merci de remplir au moins un des deux champs' });
    }

    const text_up = req.body.text_up ? req.body.text_up : "";
    const text_bottom = req.body.text_bottom ? req.body.text_bottom : "";
  

    const { width, height } = await sharp(req.file.buffer).metadata();
    
    // Créer l'élément SVG avec les dimensions de l'image
    const svgText = `
      <svg width="${width}" height="${height}">
    <!-- Texte en haut au milieu -->
    <text x="${width / 2}" y="50" font-size="30" fill="white" text-anchor="middle">${text_up}</text>
    
    <!-- Texte en bas au milieu -->
    <text x="${width / 2}" y="${height - 50}" font-size="30" fill="white" text-anchor="middle">${text_bottom}</text>
  </svg>
    `;

    // Ajouter du texte sur l'image avec Sharp
    const imageBuffer = await sharp(req.file.buffer)
      .composite([{
        input: Buffer.from(svgText),
        gravity: 'northwest', // Position du texte (en haut à gauche)
      }])
      .toBuffer();
    // Générez une clé unique pour l'image
    const file_key = `uploads/${uuidv4()}`;

    // Uploader l'image sur MinIO (ou S3)
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: file_key,
      Body: imageBuffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    })
      .promise()
      .then(() => {
        console.log('File uploaded successfully');
      })
      .catch((error) => {
        console.error('Error uploading file:', error);
        throw error; // Renvoyer l'erreur pour la gestion du bloc catch
      });

      file_url = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${BUCKET_NAME}/${file_key}`;
      const key = uuidv4().slice(0, 8);

      const params = {
        TableName: TABLE_NAME,
        Item: {
          key,
          "file_key": file_key,
          "file_url": file_url,
          createdAt: new Date().toISOString(),
          clicks: 0,
        },
      };
    
      await dynamoDb.put(params).promise();

    // Réponse avec l'URL du fichier
    res.status(200).json({
      message: 'File uploaded successfully',
      fileUrl: file_url,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'An error occurred while uploading the file',
      error: error.message,
    });
  }
});

exports.listMemes = async (event) => {
  const params = {
    TableName: TABLE_NAME,
  };

  try {
    const { Items } = await dynamoDb.scan(params).promise();

    // Mappe les éléments pour retourner les URLs et les dates de création
    const result = Items.map(item => ({
      file_url: item.file_url,
      createdAt: item.createdAt,
    }));

    // Trier les résultats par date (plus récente en premier)
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      statusCode: 200,
      body: JSON.stringify({ imageUrls: result }),
    };
  } catch (error) {
    console.error('Error fetching memes:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'An error occurred while retrieving the images', error: error.message }),
    };
  }
};



// Utiliser Lambda pour gérer cette API Express
const serverless = require('serverless-http');
module.exports.uploadImage = serverless(app);

