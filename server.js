const express = require("express");
const axios = require("axios");
const fs = require("fs").promises; // Use fs.promises for asynchronous file operations
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 400;

const genAI = new GoogleGenerativeAI('AIzaSyBcFpqFjt0FgACAGkrveyxh_ulbcSowo40');

async function fileToGenerativePart(data, mimeType) {
  try {
    return {
      inlineData: {
        data,
        mimeType,
      },
    };
  } catch (error) {
    console.error("Error reading file:", error.message);
    throw error;
  }
}

app.use(express.json({ limit: '50mb' })); // Set a higher payload size limit (adjust the limit accordingly)

app.post("/v1/completion", async (req, res) => {
  try {
    const text = req.body.prompt;
    const imageBase64Array = req.body.imageBase64Array || [];

    if (!text) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const imageParts = await Promise.all(
      imageBase64Array.map(async (imageBase64) => {
        if (imageBase64) {
          try {
            const mimeType = "image/jpeg"; // Change the mimeType based on your use case
            return await fileToGenerativePart(imageBase64, mimeType);
          } catch (conversionError) {
            console.error("Error converting base64 to generative part:", conversionError.message);
            return null;
          }
        }
        return null;
      })
    );

    const validImageParts = imageParts.filter((part) => part !== null);

    const modelName = validImageParts.length > 0 ? "gemini-pro-vision" : "gemini-pro";
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent([text, ...validImageParts]);
    const responseFromModel = await result.response;
    const content = responseFromModel.text();

    res.json({
      status: 200,
      dev: "EASY TECH API",
      content,
    });
  } catch (error) {
    console.error("Unhandled error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/status", (req, res) => {
  res.status(200).json({ status: 200, message: "EASY AI GEMINI API WORKING" });
});

app.listen(port, () => {
  app.use(express.static('public'));

  console.log(`Server is running on http://localhost:${port}`);
});
