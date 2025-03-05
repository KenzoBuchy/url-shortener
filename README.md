# Generation de meme - Local Development

## Prerequisites
- Node.js installed
- Serverless Framework installed (`npm install -g serverless`)

## Starting the Project Locally

To run the project locally using serverless-offline, use the following command:

```bash
serverless offline start --reloadHandler
```

This command:
- Starts a local API Gateway emulator
- Enables hot reloading for Lambda functions
- Watches for changes in your handler files
- Automatically restarts the service when changes are detected

The API will be available at `http://localhost:3000` by default.

## Development Notes
- Any changes to your Lambda functions will trigger automatic reload
- Check the console for endpoint URLs and port information
- Use `Ctrl+C` to stop the local server


## Routes API

### `uploadImage`
- **Méthode** : `POST`
- **Content-Type** : `multipart/form-data`
- **Paramètres** :
  - `file` : Fichier à télécharger (format `jpg` ou `png`).
  - `text_up` : Texte ajouter en haut de l'image. Optionnel si `text_bottom` est remplie
  - `text_bottom` : Texte ajouter en bas de l'image. Optionnel si `text_up` est remplie
- **Description** : Cette route permet de télécharger une image (au format `jpg` ou `png`) avec un texte. Le texte est ajouté à l'image avant qu'elle ne soit stockée dans MinIO (ou S3). L'image est ensuite rendue publique.

- **Réponse** : 
  - En cas de succès, la réponse renverra l'URL de l'image téléchargée.
  - Exemple de réponse :
    ```json
    {
      "message": "File uploaded successfully",
      "fileUrl": "http://minio-url:9000/my-bucket/uploads/uuid-image1.jpg"
    }
    ```
    - Si `text_up` et `text_bottom` ne sont pas envoyés, la réponse renverra un message d'erreur.
  - Exemple de réponse :
    ```json
    {
      "message": "Merci de remplir au moins un des deux champs" 
    }
    ```

---

### `listMemes`
- **Méthode** : `GET`
- **Description** : Cette route retourne une liste des images téléchargées, avec leurs URLs et dates de création.
- **Réponse** : 
  - Un tableau contenant des objets avec les champs `file_url` et `createdAt`.
  - Exemple de réponse :
    ```json
    {
      "imageUrls": [
        {
          "file_url": "http://minio-url:9000/my-bucket/uploads/uuid-image1.jpg",
          "createdAt": "2025-03-05T10:30:00Z"
        },
        {
          "file_url": "http://minio-url:9000/my-bucket/uploads/uuid-image2.jpg",
          "createdAt": "2025-03-04T09:20:00Z"
        }
      ]
    }
    ```
