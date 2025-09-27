import { GoogleGenAI, Type } from "@google/genai";
import { StoryElements } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const getStoryStylePrompt = (style: string): string => {
    switch (style) {
        case 'Funny':
            return 'in a witty and humorous style';
        case 'For a 3-year-old':
            return 'in a very simple, easy-to-understand style suitable for a 3-year-old child, using short sentences';
        case 'Italian Meme':
            return 'in the style of a dramatic, over-the-top, and humorous Italian meme, with exaggerated emotions';
        case 'YouTube/Instagram Shorts':
            return 'as a script for a fast-paced, engaging short video (like a YouTube Short), with a strong hook and dynamic pacing';
        case 'Metamorphosis':
            return 'telling a story of transformation, evolution, or significant change, both visually and thematically';
        case 'Dynamic':
            return 'with a high-energy, action-packed narrative, focusing on movement, conflict, and rapid progression';
        case 'Creative':
        default:
            return 'in a highly imaginative and creative style';
    }
};

export async function generateStory(concept: string, storyStyle: string): Promise<string> {
  try {
    const styleInstruction = getStoryStylePrompt(storyStyle);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Expand the following story concept ${styleInstruction} into a short, visually descriptive story of about 150 words, suitable for generating a video. Concept: "${concept}"`,
      config: {
        temperature: 0.8,
        topP: 0.9,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating story:", error);
    throw new Error("Failed to generate story. Please try again.");
  }
}

async function getStoryElements(story: string): Promise<StoryElements> {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze the following story and extract the main character (including a detailed visual description of their appearance and clothing), the primary setting, and describe the single most visually impactful or representative scene from the story. The output for the scene must be in an array containing just that one scene.

Story: "${story}"`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    character: { type: Type.STRING, description: "A detailed visual description of the main character's appearance, including clothing, age, and any defining features." },
                    setting: { type: Type.STRING, description: "A detailed visual description of the primary setting." },
                    scenes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                scene_description: { type: Type.STRING, description: "A description of the action in this specific scene." },
                                camera_angle: { type: Type.STRING, description: "A suggested camera angle (e.g., 'wide shot', 'close-up', 'over-the-shoulder')." }
                            },
                            required: ["scene_description", "camera_angle"]
                        }
                    }
                },
                required: ["character", "setting", "scenes"]
            },
        },
    });
    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr) as StoryElements;
}

const getStylePrompt = (styleSelection: string): string => {
    switch (styleSelection) {
        case 'Cartoon':
            return 'A vibrant, playful, and expressive cartoon style. Bold outlines, cel-shaded colors, and simplified shapes.';
        case '3D Animation':
            return 'Modern 3D animation style, reminiscent of a major animation studio film. Detailed textures, soft, dynamic lighting, and a sense of depth.';
        case 'Realistic':
            return 'Photorealistic and hyper-detailed. Cinematic lighting, lifelike textures, and a focus on realism. 8K resolution.';
        case 'Anime':
            return 'A classic Japanese anime style. Vibrant and saturated colors, expressive, large eyes for characters, and detailed, scenic backgrounds.';
        case 'Cinematic':
        default:
            return 'Cinematic, hyper-realistic, 3D render, fantasy art style, epic lighting, vibrant colors.';
    }
};

export async function generateImages(story: string, styleSelection: string, onProgress: (message: string) => void): Promise<string[]> {
    onProgress("Analyzing story for visual elements...");
    const storyElements = await getStoryElements(story);
    const generatedImageUrls: string[] = [];

    for (let i = 0; i < storyElements.scenes.length; i++) {
        const scene = storyElements.scenes[i];
        onProgress(`Generating image ${i + 1} of ${storyElements.scenes.length}...`);

        const prompt = `
            CRITICAL INSTRUCTION: The character's appearance MUST remain identical across all images.

            **Style:** ${getStylePrompt(styleSelection)}
            
            **Constant Elements:**
            - **Character:** (${storyElements.character}). The appearance of this character MUST NOT CHANGE.
            - **Setting:** ${storyElements.setting}

            **Scene-Specific Elements:**
            - **Scene Action:** ${scene.scene_description}
            - **Camera Angle:** ${scene.camera_angle}
        `;

        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay to help with rate limiting
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/jpeg',
                  aspectRatio: '16:9',
                },
            });
            
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            generatedImageUrls.push(imageUrl);
        } catch (error) {
            console.error(`Error generating image ${i+1}:`, error);
            throw new Error(`Failed to generate one or more images. Please try again. Error on image ${i+1}.`);
        }
    }
    return generatedImageUrls;
}

async function summarizeStoryForVideo(story: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize the following story into a single, concise sentence (under 25 words) to be used as a prompt for video generation. Story: "${story}"`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error summarizing story for video:", error);
    return story; 
  }
}

async function sanitizeVideoPrompt(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Rephrase the following sentence to be a safe, neutral, and visually descriptive prompt for an AI video generation model. Focus on action and imagery, removing any words that could be considered sensitive, dangerous, or violate safety policies. Sentence: "${prompt}"`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error sanitizing video prompt:", error);
    return prompt;
  }
}

export async function generateVideo(
    story: string, 
    styleSelection: string, 
    firstImageBase64: string,
    onProgress: (message: string) => void
): Promise<string> {
    try {
        onProgress("Creating video prompt...");
        const videoPrompt = await summarizeStoryForVideo(story);
        
        onProgress("Sanitizing prompt for safety...");
        const sanitizedPrompt = await sanitizeVideoPrompt(videoPrompt);
        
        onProgress("Initializing video generation...");
        const stylePrompt = getStylePrompt(styleSelection);

        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: `A short video in the style of ${stylePrompt}. The video is about: ${sanitizedPrompt}`,
            image: {
                imageBytes: firstImageBase64,
                mimeType: 'image/jpeg',
            },
            config: {
                numberOfVideos: 1,
            }
        });

        const progressMessages = [
            "Animating the opening scene...",
            "Rendering character movements...",
            "Building the world around your story...",
            "Applying cinematic lighting effects...",
            "Stitching frames together...",
            "Adding the final touches..."
        ];
        let messageIndex = 0;

        while (!operation.done) {
            onProgress(progressMessages[messageIndex % progressMessages.length]);
            messageIndex++;
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation });
        }

        if (operation.error) {
            let errorMessage = (operation.error as any)?.message || JSON.stringify(operation.error);
            throw new Error(`Video generation failed: ${errorMessage}`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Video generation completed but no video URI was found.");
        }

        onProgress("Fetching your masterpiece...");
        const response = await fetch(`${downloadLink}&key=${API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.statusText}`);
        }
        
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);
    } catch (error) {
        console.error("Error generating video:", error);
        throw error instanceof Error ? error : new Error("Failed to generate the video.");
    }
}