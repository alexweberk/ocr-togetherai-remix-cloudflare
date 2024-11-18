import Together from "together-ai";

export async function ocr({
  arrayBuffer,
  apiKey = "",
  model = "Llama-3.2-90B-Vision",
}: {
  arrayBuffer: ArrayBuffer;
  apiKey?: string;
  model?: "Llama-3.2-90B-Vision" | "Llama-3.2-11B-Vision" | "free";
}) {
  console.log(
    "OCR function called with array buffer size:",
    arrayBuffer.byteLength
  );

  if (!arrayBuffer) {
    throw new Error("arrayBuffer is required");
  }
  if (!apiKey) {
    throw new Error("apiKey is required");
  }

  const visionLLM =
    model === "free"
      ? "meta-llama/Llama-Vision-Free"
      : `meta-llama/${model}-Instruct-Turbo`;

  console.log("Using model:", visionLLM);

  const together = new Together({
    apiKey,
  });

  const finalMarkdown = await getMarkDown({
    together,
    visionLLM,
    arrayBuffer,
  });

  return finalMarkdown;
}

async function getMarkDown({
  together,
  visionLLM,
  arrayBuffer,
}: {
  together: Together;
  visionLLM: string;
  arrayBuffer: ArrayBuffer;
}) {
  console.log("Converting array buffer to base64...");

  let base64String;
  try {
    const chunk = 8192; // Process in chunks to avoid stack overflow
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i += chunk) {
      const slice = uint8Array.slice(i, i + chunk);
      binary += String.fromCharCode.apply(null, slice as unknown as number[]);
    }
    base64String = btoa(binary);
    console.log("Base64 conversion successful, length:", base64String.length);
  } catch (error) {
    console.error("Base64 conversion failed:", error);
    throw new Error("Failed to convert image to base64");
  }

  const systemPrompt = `Convert the provided image into Markdown format. Ensure that all content from the page is included, such as headers, footers, subtexts, images (with alt text if possible), tables, and any other elements.

  Requirements:

  - Output Only Markdown: Return solely the Markdown content without any additional explanations or comments. ONLY MARKDOWN.
  - No Delimiters: Do not use code fences or delimiters like \`\`\`markdown.
  - Complete Content: Do not omit any part of the page, including headers, footers, and subtext.
  `;

  try {
    console.log("Making API request to Together AI...");
    const output = await together.chat.completions.create({
      model: visionLLM,
      messages: [
        {
          role: "user",
          // @ts-expect-error - Together AI types don't properly support mixed content array
          content: [
            { type: "text", text: systemPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64String}`,
              },
            },
          ],
        },
      ],
    });

    if (!output?.choices[0]?.message?.content) {
      throw new Error("No content returned from Together");
    }
    console.log("Successfully received response from Together AI");
    return output.choices[0].message.content;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}
