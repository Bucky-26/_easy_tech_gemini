const express = require("express");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs").promises; // Use fs.promises for asynchronous file operations

const app = express();
const port = process.env.PORT || 400;

const genAI = new GoogleGenerativeAI('AIzaSyALP6y2MzGvxaErwgUGFXmxiZ2S1Sl-fRE');

app.use(express.json({ limit: 'Infinity' })); // Remove payload size limit

async function streamToGenerativePart(imageBase64, mimeType) {
  try {
    const stream = Buffer.from(imageBase64, 'base64').toString('utf8');
    return {
      inlineData: {
        data: stream,
        mimeType,
      },
    };
  } catch (error) {
    console.error("Error streaming image data:", error.message);
    throw error;
  }
}

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
            return await streamToGenerativePart(imageBase64, mimeType);
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
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/status", (req, res) => {
  res.status(200).json({ status: 200, message: "EASY AI GEMINI API WORKING" });
});

app.listen(port, () => {
  app.use(express.static('public'));

  console.log(`Server is running on http://localhost:${port}`);
});
