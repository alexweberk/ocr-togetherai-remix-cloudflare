import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import {
  Form,
  json,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";

import { useState } from "react";
import Spinner from "~/components/Spinner";
import { ocr } from "~/lib/ocr";
import { getRemainingAttempts, incrementAttemptCounter } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [
    { title: "OCR Llama with Remix / Cloudflare" },
    { name: "description", content: "OCR Llama with Remix / Cloudflare" },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const { env } = context.cloudflare;

  const attempts = await getRemainingAttempts(env.RATE_LIMITS, ip);

  return json({ remainingAttempts: attempts });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env } = context.cloudflare;
  const { TOGETHER_API_KEY, RATE_LIMITS } = env;

  if (!TOGETHER_API_KEY) {
    return json({ error: "TOGETHER_API_KEY is not set" }, { status: 400 });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  const remaining = await getRemainingAttempts(RATE_LIMITS, ip);
  if (remaining <= 0) {
    return json(
      {
        error:
          "I'm currently setting a rate limit of max 3 times per day to slow down running out of Together AI API credits. Sorry!",
      },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("image");

  if (!file || !(file instanceof File)) {
    return json({ error: "No valid file uploaded" }, { status: 400 });
  }

  try {
    console.log("File received:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const arrayBuffer = await file.arrayBuffer();
    console.log("Array buffer size:", arrayBuffer.byteLength);

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    const markdown = await ocr({
      arrayBuffer,
      apiKey: TOGETHER_API_KEY,
    });

    // Increment the attempts counter if successful. Remaining attempts are
    // reset automatically after 24 hours.
    await incrementAttemptCounter(RATE_LIMITS, ip);

    return json({ markdown });
  } catch (error) {
    console.error("Error processing request:", error);
    return json(
      {
        error: `Error: ${(error as Error).message}`,
        stack: (error as Error).stack,
      },
      { status: 500 }
    );
  }
}

export default function Index() {
  const navigation = useNavigation();
  const actionData = useActionData<{
    markdown?: string;
    error?: string;
  }>();
  const { remainingAttempts } = useLoaderData<typeof loader>();
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        event.target.value = ""; // Reset input
        return;
      }
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="container mt-16 mx-auto max-w-3xl px-4">
      <div className="flex flex-col gap-8">
        <h1 className="text-4xl font-bold">
          OCR Llama with Remix / Cloudflare
        </h1>

        <div id="inputSection">
          <h2 className="text-2xl font-bold">Upload your file</h2>
          <Form
            method="post"
            encType="multipart/form-data"
            className="mt-8 flex flex-col gap-4"
          >
            <input
              type="file"
              name="image"
              accept=".png,.jpg,.jpeg,.heic"
              onChange={handleFileChange}
              disabled={remainingAttempts <= 0}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                  file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700
                  hover:file:bg-violet-100 disabled:opacity-50"
            />
            {preview && (
              <div className="mt-4 flex justify-center">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-[300px] w-full rounded-lg object-contain"
                />
              </div>
            )}
            <button
              type="submit"
              className="rounded bg-violet-500 px-8 py-2 text-white hover:bg-violet-600 disabled:opacity-50 max-w-fit mx-auto"
              disabled={navigation.state !== "idle" || remainingAttempts <= 0}
            >
              {navigation.state !== "idle"
                ? "Uploading..."
                : remainingAttempts <= 0
                ? "Daily limit reached"
                : "Convert to Markdown"}
            </button>
            <span className="text-sm text-gray-600 text-center italic">
              Remaining attempts today: {remainingAttempts}
            </span>
          </Form>
          {actionData?.error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-500">{actionData.error}</p>
            </div>
          )}
        </div>
        <div id="outputSection">
          <h2 className="text-2xl font-bold">Output</h2>
          {navigation.state !== "idle" ? (
            <>
              <Spinner />
              <div className="flex flex-col items-center">
                <span className="text-sm text-gray-600 text-center italic">
                  Converting to Markdown.
                  <br /> This can take about a minute or more on my extremely
                  cheapo free plan. 💸
                </span>
              </div>
            </>
          ) : (
            <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-100 p-4">
              {actionData?.markdown
                ? actionData.markdown
                : "Your output goes here :)"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
